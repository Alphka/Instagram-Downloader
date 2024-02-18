<h1 align="center">Instagram Downloader</h1>

### Description
A program written in JavaScript to download images and videos from Instagram.

<hr>

### Usage

```
instadl [options] username
instadl [options] username1 username2
```

<hr>

### Supported options

```
Usage: instadl [options] <string>

Arguments:
  string                Usernames

Options:
  -v, --version         Display program version
  -o, --output [path]   Output directory
  -f, --force           Force creation of output directory
  -q, --queue <number>  Set how many items to get from Instagram API (default: 12)
  -l, --limit <number>  Set how many items to download in total
  -ns, --no-stories     Disable stories download
  -nt, --no-timeline    Disable timeline download
  -nh, --no-highlights  Disable highlights download
  -nhc, --no-hcover     Disable highlights' cover download
  -h, --help            Display help
```

<hr>

### Installation

```
npm install
npm link
```

### License

[ISC](LICENSE.md) © 2023 Kayo Souza
