package validate

import (
	"fmt"
	"regexp"
	"strings"
)

var usernameAllowedChars = regexp.MustCompile(`^[\w.]{1,30}$`)
var consecutiveDotsPattern = regexp.MustCompile(`\.\.`)

func ValidateUsername(username string) error {
	trimmed := strings.TrimSpace(username)

	if len(trimmed) == 0 || len(username) > 64 {
		return fmt.Errorf("invalid username %q: length must be between 1 and 64 characters", username)
	}

	allUnderscores := true
	for _, character := range username {
		if character != '_' {
			allUnderscores = false
			break
		}
	}

	if allUnderscores {
		return fmt.Errorf("invalid username %q: cannot consist entirely of underscores", username)
	}

	if !usernameAllowedChars.MatchString(username) {
		return fmt.Errorf("invalid username %q: only letters, numbers, underscores, and dots are allowed", username)
	}

	if username[0] == '.' || username[len(username)-1] == '.' {
		return fmt.Errorf("invalid username %q: cannot start or end with a dot", username)
	}

	if consecutiveDotsPattern.MatchString(username) {
		return fmt.Errorf("invalid username %q: consecutive dots are not allowed", username)
	}

	return nil
}
