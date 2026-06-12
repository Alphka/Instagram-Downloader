package config

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3"
	"github.com/zalando/go-keyring"
)

const keyringService = "instadl"

type Store struct {
	database  *sql.DB
	token     string
	userID    string
	sessionID string
}

type Cookies map[string]string

type Config struct {
	AppID   string
	FbDtsg  string
	Cookies Cookies
}

func DefaultDirectory() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("getting user config directory: %w", err)
	}

	appDir := filepath.Join(configDir, "instadl")
	if err := os.MkdirAll(appDir, 0o755); err != nil {
		return "", fmt.Errorf("creating application directory: %w", err)
	}

	return appDir, nil
}

func OpenStore(directory string) (*Store, error) {
	path := filepath.Join(directory, "instadl.db")

	database, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_synchronous=NORMAL")
	if err != nil {
		return nil, fmt.Errorf("opening database at %s: %w", path, err)
	}

	store := &Store{database: database}

	if err := store.migrate(); err != nil {
		database.Close()
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	return store, nil
}

func (store *Store) migrate() error {
	_, err := store.database.Exec(`
		CREATE TABLE IF NOT EXISTS config (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		) STRICT;
	`)
	return err
}

func (store *Store) Close() error {
	return store.database.Close()
}

func (store *Store) get(key string) (string, error) {
	var value string
	err := store.database.QueryRow(`SELECT value FROM config WHERE key = ?`, key).Scan(&value)

	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}

	if err != nil {
		return "", fmt.Errorf("reading key %q: %w", key, err)
	}

	return value, nil
}

func (store *Store) set(key, value string) error {
	_, err := store.database.Exec(`
		INSERT INTO config (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, value,
	)

	if err != nil {
		return fmt.Errorf("writing key %q: %w", key, err)
	}

	return nil
}

func (store *Store) GetCookies() (Cookies, error) {
	raw, err := store.get("cookies")
	if err != nil {
		return nil, err
	}

	cookies := make(Cookies)

	if raw == "" {
		return cookies, nil
	}

	if err := json.Unmarshal([]byte(raw), &cookies); err != nil {
		return nil, fmt.Errorf("parsing stored cookies: %w", err)
	}

	return cookies, nil
}

func (store *Store) SetCookies(cookies Cookies) error {
	encoded, err := json.Marshal(cookies)
	if err != nil {
		return fmt.Errorf("encoding cookies: %w", err)
	}

	return store.set("cookies", string(encoded))
}

func (store *Store) MergeCookies(incoming map[string]string) error {
	if len(incoming) == 0 {
		return nil
	}

	cookies, err := store.GetCookies()
	if err != nil {
		return err
	}

	maps.Copy(cookies, incoming)

	return store.SetCookies(cookies)
}

func (store *Store) GetAppID() (string, error) {
	return store.get("app_id")
}

func (store *Store) SetAppID(appID string) error {
	return store.set("app_id", appID)
}

func (store *Store) GetFbDtsg() (string, error) {
	return store.get("fb_dtsg")
}

func (store *Store) SetFbDtsg(fbDtsg string) error {
	return store.set("fb_dtsg", fbDtsg)
}

func BuildCookieHeader(cookies Cookies) string {
	parts := make([]string, 0, len(cookies))

	for key, value := range cookies {
		parts = append(parts, key+"="+value)
	}

	return strings.Join(parts, "; ")
}

func (store *Store) InitializeCredentials(flagToken, flagSessionID, flagUserID string) error {
	existingToken, _ := keyring.Get(keyringService, "csrftoken")
	existingUserID, _ := keyring.Get(keyringService, "userid")
	existingSessionID, _ := keyring.Get(keyringService, "sessionid")

	finalToken := existingToken
	if flagToken != "" {
		finalToken = flagToken
	}

	finalUserID := existingUserID
	if flagUserID != "" {
		finalUserID = flagUserID
	}

	finalSessionID := existingSessionID
	if flagSessionID != "" {
		finalSessionID = flagSessionID
	}

	if finalUserID != "" && finalUserID != existingUserID && existingUserID != "" {
		store.SetCookies(make(Cookies))
		store.SetFbDtsg("")
	}

	if finalToken == "" || finalSessionID == "" || finalUserID == "" {
		return errors.New("authentication required: token, sessionid, and userid must be set")
	}

	if flagToken != "" && flagToken != existingToken {
		keyring.Set(keyringService, "csrftoken", finalToken)
	}

	if flagUserID != "" && flagUserID != existingUserID {
		keyring.Set(keyringService, "userid", finalUserID)
	}

	if flagSessionID != "" && flagSessionID != existingSessionID {
		keyring.Set(keyringService, "sessionid", finalSessionID)
	}

	store.token = finalToken
	store.userID = finalUserID
	store.sessionID = finalSessionID

	return nil
}

func (store *Store) GetToken() string {
	return store.token
}

func (store *Store) GetUserID() string {
	return store.userID
}

func (store *Store) GetSessionID() string {
	return store.sessionID
}

func (store *Store) UpdateToken(token string) {
	if token != "" && token != store.token {
		store.token = token
		keyring.Set(keyringService, "csrftoken", token)
	}
}

func (store *Store) UpdateUserID(userID string) {
	if userID != "" && userID != store.userID {
		store.userID = userID
		keyring.Set(keyringService, "userid", userID)
	}
}

func (store *Store) UpdateSessionID(sessionID string) {
	if sessionID != "" && sessionID != store.sessionID {
		store.sessionID = sessionID
		keyring.Set(keyringService, "sessionid", sessionID)
	}
}
