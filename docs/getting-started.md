# Getting started

## 1. Run it

**With Docker**

```bash
git clone https://github.com/OWNER/undertone.git
cd undertone
docker compose up -d
```

That builds the image and starts Undertone on port 8787.

Everything it remembers (accounts, libraries, playlists, settings) is in the `undertone-data` volume, so updating is
`git pull && docker compose up -d --build`. To back up, copy the volume's `undertone.db` file. To move servers, bring
that file along.

**Without Docker**

```bash
./start-local.sh
```

Needs Node.js 22.13 or newer. Data goes to `./data`.

**Settings**

Set them under `environment:` in `docker-compose.yml`, or as environment variables.

| Setting             | What it does                                                                                 | Default                                  |
| ------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `PORT`              | Port to listen on                                                                            | `8787`                                   |
| `DATA_DIR`          | Where the database file lives                                                                | `/data` in the image, `./data` otherwise |
| `SERVER_NAME`       | Name shown to apps and on the setup page                                                     | `Undertone`                              |
| `SIGNUP`            | `open` lets anyone create an account from the start                                          | `closed`                                 |
| `CONNECTIONS_DIR`   | A folder of connection files to serve at `/connections/<file>.json`                          | `/app/connections` in the image          |
| `PRIVATE_NETWORK`   | Who may use connections that reach private or local addresses: `admin`, `everyone`, `nobody` | `admin`                                  |
| `TRUST_PROXY`       | `true` when a reverse proxy in front sets `X-Forwarded-For`                                  | off                                      |
| `CONNECTIONS_INDEX` | Link to a list of connections to offer, instead of the one in that folder                    | none                                     |
| `CATALOG`           | Link to a catalog connection file to start with, instead of letting the admin pick           | none                                     |

**Offering connections to the people on your server**

Put connection files and an `index.json` in the `connections` folder next to `docker-compose.yml`. The folder is
mounted into the container and its files are served at `/connections/`. What `index.json` lists shows up under
"Available" on the Connections page, and catalogs in it can be picked on the People page. The format of the list is
at the end of [Writing connections](connections.md).

With an empty folder the server starts with nothing configured. People can still add connections by link, by file or
by pasting.

**Putting it on the internet**

Run it behind a reverse proxy that adds HTTPS (Caddy, Traefik, nginx). Undertone reads the usual `X-Forwarded-Proto`
and `X-Forwarded-Host` headers, so the address it shows on the Apps page is the public one. A Caddyfile is two lines:

```
music.example.com {
  reverse_proxy localhost:8787
}
```

## 2. Create the first account

Open the server's address. The first account created becomes the admin.

After that, the admin decides who can join, on the **People** page:

- "Let anyone create an account" on: the sign-in page offers "Create an account".
- Off: only the admin adds people.

## 3. Choose a catalog (admin, once)

On **People → Catalog**, pick one from the list or paste the link to a catalog connection file. The catalog is what
you search and browse. There is one per server because everyone's library and playlists are built on its item ids;
changing it later makes existing libraries stop opening.

## 4. Add your connections

On **Connections**, add what you use. Three ways:

- paste the link to a connection file (a GitHub link works),
- choose the file from your computer,
- paste the file's contents.

If a connection needs something from you (an API key, a server address), its settings open straight away. "Save" also
tests it.

Connections are asked **from the top down, one at a time**. The first one that has the song plays it and the rest are
not contacted. Reorder them with the arrows, and switch any of them off without removing it.

"Try a song" at the top of the page looks a song up and tells you which connection would play it, in what format and
how long it took.

## 5. Connect an app

On **Apps** you'll find the server address. In a Jellyfin music app (Finamp, Feishin, Symfonium, Manet and others), add
a server with that address and sign in with your Undertone username and password.

Search for anything. What you play and favorite becomes your library.

## 6. Import playlists

On **Import**, paste either:

- a playlist link, if you have a connection that reads that service, or
- a list of songs copied from anywhere: one `Artist - Title` per line, a CSV export with track and artist columns, or
  the contents of an M3U file.

Each song is matched to the catalog and saved as a normal playlist. With "Get the songs ready to play" on, each one is
also looked up on your audio connections now, so it starts immediately later.

## 7. Request a song

On **Requests**, search for a song that doesn't play yet and press **Request**. Your connections pass the request to
their services, and the song stays on the list until it is ready. When a connection knows several albums by the
artist but cannot tell from their names which one holds the song, it lists them and you pick one.

A connection that has a setting for it can also do this by itself when an app asks for a song that isn't ready; those
show up on the same list.

## 8. Playlists

On **Playlists** you see the same playlists your apps show: create, rename, reorder, add songs from the catalog,
delete. A change made here appears in the app and the other way round. Each account has its own; nobody sees
another person's.

Once you have played and liked a few things, lists made for you appear next to them, in the apps too: your most
played songs, the ones you liked, what you played lately, and a mix built around the artists you listen to most. They
keep themselves up to date and cannot be edited.

## Hosting it for other people

- **Accounts.** Sign-up is closed after the first account unless you open it. Passwords need 8 characters and are
  stored salted and hashed. Repeated wrong passwords from one address are held back for a few minutes.
- **HTTPS.** Put the server behind a reverse proxy that terminates TLS, and set `TRUST_PROXY=true` so the limits above
  count the visitor's address and not the proxy's.
- **Private addresses.** A connection makes the server send requests to whatever address its file names. By default
  only an admin's connections may reach private and local addresses (a music server on your own network, for
  example); everyone else's are refused. `PRIVATE_NETWORK=everyone` lifts that on a server where you trust every
  account, `PRIVATE_NETWORK=nobody` applies it to admins as well.
- **Limits.** Request bodies, answers from services and the number of playlists per account are capped, so one
  account cannot exhaust the machine.
- **What an account can see.** Its own connections, settings, playlists, history and requests. Admins manage accounts
  and the catalog; they cannot read other people's connection settings from the page.

## Good to know

- **Playback delivery** (Account page). "Direct when possible" hands your app the connection's own link. Files that a
  service serves as a generic file are relayed through Undertone either way, because most players refuse those.
- **Secrets** you enter (API keys, passwords) are stored in the server's database so the connection can use them. Use
  keys you can revoke.
