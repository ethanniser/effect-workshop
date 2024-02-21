# Things you can try adding after the workshop to reinforce what you learned:

1. Implement the Client yourself

- What can you reuse from the server code? What will you have to modify?
- What will the ui be? A cli (use `@effect/platform` for terminal interface or `@effect/cli`)? Or maybe a web app?

2. Add Authentication

- Maybe a password is needed to connect
- Different roles? User vs Admin?

3. Chat Rooms

- Add different rooms
- How will the user see and select a room?
- Are some rooms public vs private?
- How are rooms structed on the server? Is each room a fiber that manages its own connections?

4. Persistance

- Persist messages to some kind of database (just a file is a great place to start, but if your feeling adventerous check out `sqlfx/sql` soon to be `@effect/sql`)
- Define a persistance/database service and explore providing different live implementations (memory vs file vs sql)

5. Typing Indicators

- Makes things a bit more real time
- How does server track and broadcast? How does client display?

6. End-to-End Encryption

- Privacy! Implement encrpytion so that the server is unable to see the raw message contents

7. File Sharing

- Allow users to upload files
- How are files send and distributed?
- Are files stored somewhere? Where?
