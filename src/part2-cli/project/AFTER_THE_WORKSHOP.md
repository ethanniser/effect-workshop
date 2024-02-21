# Things you can try adding after the workshop to reinforce what you learned:

_Having trouble or want to share your solution? @ me in the Effect discord!_

## Not necessarily in any particular order:

1. Advanced Scheduling

- Support more advanced scheduling strategies like exponential backoff
- What options should be configurable? How will you construct the `Schedule` from them?

2. Redirect Support

- Make it either the default or an option to have the cli automatically resolve redirects
- Maybe pattern match on the response status code?
- Maybe create a new error type for a sucessful inital response, but failed redirect resolution. How should that error be handled?

3. Form data / File upload support

- Add support for more complex http bodies
- Maybe use `@effect/platform` for file system

4. Authentication

- Add support for attaching a api key through a authorization header

5. Concurrent Requests

- Add support for issuing more than one request in a single command concurrently
- Maybe use `Effect.all`

6. Cookies

- Support reading / setting cookies
- Maybe decode cookie header with `@effect/schema`

7. Better Error Handling

- Right now we're just logging errors. How can we improve this? Remember, all errors are fully typed, so use that to your advantage.
