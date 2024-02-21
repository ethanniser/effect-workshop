# Things you can try adding after the workshop to reinforce what you learned:

1. Redirect Support

- Make it either the default or an option to have the cli automatically resolve redirects
- Maybe pattern match on the response status code?
- Maybe create a new error type for a sucessful inital response, but failed redirect resolution. How should that error be handled?

2. Form data / File upload support

- Add support for more complex http bodies
- Maybe use `@effect/platform` for file system

3. Authentication

- Add support for attaching a api key through a authorization header

4. Concurrent Requests

- Add support for issuing more than one request in a single command concurrently
- Maybe use `Effect.all`

5. Cookies

- Support reading / setting cookies
- Maybe decode cookie header with `@effect/schema`
