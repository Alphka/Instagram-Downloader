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
  -d, --debug           Verbose output
  -fd, --flat-dir       Download all contents of the user in the same directory
  -wt, --with-thumbs    Download thumbnails of videos
  -h, --help            Display help
```

<hr>

### Installation

```
npm install
npm link
```

> [!NOTE]
> Before executing the CLI program, copy the contents of the file `.env.example` to a new file named `.env` and
> fill all the environment variables there with your account credentials that are stored in the browser's cookies.
> This program will not work without authentication.

> [!NOTE]
> If the code fails, even after setting your account credentials in the `.env` file, try setting the `COOKIES`
> property with a JSON object, like this: `COOKIES={"datr":"...","ig_did":"..."}`, and deleting the `config.json` file.
> This avoids authentication issues with the Instagram API.

### License

[ISC](LICENSE.md) © 2023 Kayo Souza
