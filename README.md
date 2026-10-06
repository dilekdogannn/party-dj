# Party DJ

A shared music queue for parties. One screen plays the music; everyone else
adds songs and votes from their phone. The song with the most votes plays next.

No app to install and no sign-up: guests scan a QR code and they are in.

## How it works

1. The host opens Party DJ on the laptop or TV that plays the music and starts a room.
2. The host screen shows a QR code and a four-letter room code.
3. Guests open the room on their phones, search for songs and add them to the queue.
4. Everyone can vote. The queue reorders live on every screen.
5. When a song ends, the top-voted song starts automatically.

## Tech

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS 4**
- **Server-Sent Events** for live updates
- **iTunes Search API** for the song catalogue and 30-second previews

## Running locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and start a party.

```bash
npm test      # unit tests for the queue logic
npm run lint
```

To join from a phone, both devices must be on the same Wi-Fi. Open the host
screen through your computer's network address (for example
`http://192.168.1.20:3000`) instead of `localhost`, so the QR code points to an
address the phone can reach.

## Design notes

**Live updates use Server-Sent Events, not WebSockets.** Updates only flow from
the server to the browsers; guests send their actions as normal HTTP requests.
SSE covers that with a plain HTTP response, and the browser reconnects on its
own after a network drop.

**The server is the only source of truth.** After every change the server sends
each client the complete room state. Clients never calculate the queue order
themselves, so two phones can never disagree about what plays next.

**The client is not trusted.** To add a song, the browser sends only a track id.
The server looks the track up itself, so nobody can queue made-up songs or
arbitrary audio URLs.

**One vote per guest, no accounts.** Each browser gets a random id that is saved
locally. Votes are stored per id on the server, and other guests' ids are never
sent to the browser.

**Skipping is safe to repeat.** The host says which track it believes is
playing. If that track has already changed, the request does nothing, so a
double click or a late "song ended" event cannot skip two songs.

**Only the host can skip or remove songs.** Creating a room returns a secret
token that is kept in the host's browser and checked on the server.

## Limitations

- Songs play as 30-second previews, because that is what the iTunes API provides.
- Rooms are kept in the server's memory. They are lost on restart, and the app
  must run as a single long-lived Node.js process (not on serverless hosting).

## Roadmap

- [ ] Store rooms in a database so the app can run on serverless hosting
- [ ] Full-length playback through a streaming provider
- [ ] Let the host remove guests
