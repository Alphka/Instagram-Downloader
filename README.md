<h1 align="center">Instagram Downloader</h1>

### Description
A program written in Go to download images and videos from Instagram.

<hr>

### Requirements

- [Go](https://go.dev/dl/) (minimum v1.25)
- [FFmpeg](https://ffmpeg.org/download.html) (optional, required for static video detection with `--with-thumbs`)

<hr>

### Usage

```
instadl [flags] <username>
instadl [flags] <username1> <username2>
```

<hr>

### Supported flags

```
Usage:
  instadl <username> [username...] [flags]

Flags:
  -d, --debug                  enable verbose output
      --flat-dir               save all user content into a single directory
  -f, --force                  force creation of output directory if it does not exist
  -h, --help                   help for instadl
  -l, --limit int              maximum number of items to download per user
      --no-hcover              skip highlight cover download
      --no-highlights          skip highlights download
      --no-stories             skip stories download
      --no-timeline            skip timeline download
  -o, --output string          output directory
  -q, --queue int              number of concurrent downloads (default 12)
      --set-sessionid string   set or overwrite authentication session ID
      --set-token string       set or overwrite authentication CSRF token
      --set-userid string      set or overwrite authentication user ID
  -v, --version                version for instadl
      --with-thumbs            also download video thumbnails (requires ffmpeg in PATH for static video detection)
```

<hr>

### Installation

```sh
# Linux (Bash)
go build -o $GOPATH/bin/instadl .

# Windows PowerShell
go build -o $env:GOPATH/bin/instadl.exe .
```

<hr>

### Authentication

Before running the program for the first time, you need to provide your Instagram session credentials.
These are stored in the browser cookies when you log in to Instagram.

Open Instagram in a browser, go to DevTools → Application/Storage → Cookies → `https://www.instagram.com` and copy
the values of `csrftoken`, `ds_user_id` and `sessionid`.

Then run the program once with the three flags below to save the credentials:

```
instadl --set-token <csrftoken> --set-userid <ds_user_id> --set-sessionid <sessionid> <username>
```

Credentials are stored securely in the operating system's native credential manager (Windows Credential Manager on Windows,
Keychain on macOS, or GNOME Keyring/KWallet on Linux) and are reused automatically on subsequent runs.

> [!IMPORTANT]
> This program will not work without authentication.

> [!IMPORTANT]
> If requests start failing after some time, your session may have expired.
> Get fresh cookie values from the browser and run the command above again to update them.

### License

[ISC](LICENSE.md) © 2023 Kayo Souza
