Colour Win X - Web Starter
Folders:
- server/: Node.js backend (socket.io + mongo)
- web/: React user client (play color & number)
- admin/: React admin panel

Run server:
  cd server
  cp .env.example .env
  npm install
  node index.js

Create demo user in mongo:
  use colour_win_x
  db.users.insertOne({ phone:'9000000001', displayName:'Demo1', wallet:1000 })

Run web:
  cd web
  npm install
  npm run dev

Run admin:
  cd admin
  npm install
  npm run dev
