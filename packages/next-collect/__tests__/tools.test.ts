import { createPrefixMap, deepMerge, flatten, removeSuffix, sanitizeObject } from "../src/tools"

test("removeSuffix", () => {
  expect(removeSuffix("https://host.com/", "/")).toBe("https://host.com")
  expect(removeSuffix("https://host.com", "/")).toBe("https://host.com")
  expect(removeSuffix("https://host.com//", "/")).toBe("https://host.com")
  expect(removeSuffix("https://", ["/", ":"])).toBe("https")
})

test("sanitizeObject", () => {
  expect(
    sanitizeObject({
      a: [undefined, 1, undefined],
      b: {
        c: "s",
        d: undefined,
      },
    })
  ).toEqual({ a: [1], b: { c: "s" } })
  expect(
    sanitizeObject(
      {
        a: [undefined, 1, undefined],
        b: {
          c: "s",
          d: undefined,
        },
      },
      { undefs: "toNull" }
    )
  ).toEqual({ a: [null, 1, null], b: { c: "s", d: null } })
})

test("prefixMap", () => {
  const map = createPrefixMap([
    ["/api/endpoint", null],
    ["/favicon.ico", "$skip"],
    ["/specific/page", "page2"],
    ["/img*", null],
    ["/api*", "api_event"],
    ["/*", "page_event"],
  ])
  // expect(map.get("/any_path")).toBe("page_event")
  // expect(map.get("/api/test")).toBe("api_event")
  // expect(map.get("/specific/page")).toBe("page2")
  // expect(map.get("/img/cat.png")).toBe(null)
  expect(map.get("/api/endpoint")).toBe(null)
  // expect(map.get("/favicon.ico")).toBe("$skip")

  // expect(() => {
  //   createPrefixMap([["*a*", "test"]])
  // }).toThrow()
})

test("deepMerge", () => {
  expect(
    deepMerge(
      { test: 1, test2: 2, user: { name: "john", id: 2 } },
      { test3: 3, test: 4, user: { name: "jack", email: 3 } }
    )
  ).toEqual({
    test: 4,
    test2: 2,
    test3: 3,
    user: { name: "jack", id: 2, email: 3 },
  })
})

test("flattenJson", () => {
  const flat = flatten({ test: 1, test2: 2, user: { name: "john", id: 2, array: [1, 2] } })
  console.log(JSON.stringify(flat, null, 2))
  expect(flat).toEqual({
    test: 1,
    test2: 2,
    user_name: "john",
    user_id: 2,
    user_array: "[1,2]",
  })
})
