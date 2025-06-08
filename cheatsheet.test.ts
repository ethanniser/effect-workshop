import { describe, it, expect } from "vitest"
import { Effect, pipe } from "effect"
import * as fs from "node:fs/promises"
import * as path from "node:path"

// Helper function to extract links from markdown content
const extractLinks = (content: string): Array<{ name: string; url: string }> => {
  const linkRegex = /\[`([^`]+)`\]\((https:\/\/effect\.website\/docs\/[^)]+)\)/g
  const links: Array<{ name: string; url: string }> = []
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    // Since we know our regex pattern has two capture groups that must exist
    // when there's a match, we can safely assert these are strings
    const name = match[1] as string
    const url = match[2] as string
    links.push({ name, url })
  }

  return links
}

// Helper function to check if a URL is accessible
const checkUrl = (url: string): Effect.Effect<boolean, Error> =>
  Effect.tryPromise({
    try: () =>
      fetch(url, { method: "HEAD" }).then((res) => res.ok),
    catch: (error) => new Error(`Failed to check URL ${url}: ${error}`)
  })

describe("Effect Cheatsheet Links", () => {
  it("should have all valid links", async () => {
    // Read the cheatsheet file
    const content = await fs.readFile(
      path.join(process.cwd(), "CHEATSHEET.md"),
      "utf-8"
    )

    // Extract all links
    const links = extractLinks(content)

    // Check each link
    const results = await Effect.runPromise(
      Effect.all(
        links.map(({ name, url }) =>
          pipe(
            checkUrl(url),
            Effect.map((isValid) => ({ name, url, isValid }))
          )
        ),
        { concurrency: 5 }
      )
    )

    // Filter out invalid links
    const invalidLinks = results.filter((result) => !result.isValid)

    // Assert that all links are valid
    expect(invalidLinks).toHaveLength(0)

    // If there are invalid links, provide detailed information
    if (invalidLinks.length > 0) {
      console.error("Invalid links found:")
      invalidLinks.forEach(({ name, url }) => {
        console.error(`- ${name}: ${url}`)
      })
    }
  })
}) 