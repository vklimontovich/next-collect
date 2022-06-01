import {
  createPrefixMap,
  deepClone,
  deepDelete,
  deepGet,
  deepMerge,
  deepSet,
  flatten,
  removeSuffix,
  sanitizeObject,
  splitObject,
} from "../src/tools"

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
    ["*.svg", null],
    ["/api*", "api_event"],
    ["/*", "page_event"],
  ])
  // expect(map.get("/any_path")).toBe("page_event")
  // expect(map.get("/api/test")).toBe("api_event")
  // expect(map.get("/specific/page")).toBe("page2")
  // expect(map.get("/img/cat.png")).toBe(null)
  expect(map.get("/logo.svg")).toBe(null)
  // expect(map.get("/api/endpoint")).toBe(null)
  // expect(map.get("/favicon.ico")).toBe("$skip")

  expect(() => {
    createPrefixMap([["*a*", "test"]])
  }).toThrow()
})
test("testSplit", () => {
  const obj = {
    a: {
      b: 1,
      d: 2,
    },
    c: 4,
    d: 5,
  }
  const [base, extra] = splitObject(obj, ["d", ["a", "b"]])

  expect(base).toEqual({
    a: { b: 1 },
    d: 5,
  })
  expect(extra).toEqual({
    a: { d: 2 },
    c: 4,
  })
})

test("deepClone/Set/Get/Delete", () => {
  const obj: any = {
    a: 1,
    b: {
      c: 2,
      d: {
        e: 3,
      },
    },
  }
  expect(deepGet({ a: 1 }, ["a"])).toBe(1)

  expect(deepClone(obj)).toEqual(obj)
  deepSet(obj, ["b", "c"], 4)
  expect(obj.b.c).toBe(4)
  expect(deepGet(obj, ["b", "d", "e"])).toBe(3)
  expect(deepGet(obj, ["b", "d", "non-existing"])).toBe(undefined)
  expect(deepGet(obj, ["not-prop", "d", "non-existing"])).toBe(undefined)
  deepSet(obj, ["x", "y", "z"], "a")
  expect(obj?.x?.y?.z).toBe("a")
  deepDelete(obj, ["x", "y", "z"])
  expect(obj?.x?.y?.z).toBe(undefined)
  expect(obj?.x?.y).toEqual({})
  deepDelete(obj, ["x"])
  expect(obj?.x).toBe(undefined)
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

  expect(deepMerge({ test: 1 }, { test: undefined })).toEqual({
    test: 1,
  })
})

test("flattenJson", () => {
  const flat = flatten(
    { test: 1, test2: 2, user: { name: "john", id: 2, array: [1, 2] }, stop: { a: 1, b: 2 } },
    {
      stopPaths: ["stop"],
    }
  )
  console.log(JSON.stringify(flat, null, 2))
  expect(flat).toEqual({
    test: 1,
    test2: 2,
    user_name: "john",
    user_id: 2,
    user_array: "[1,2]",
    stop: { a: 1, b: 2 },
  })
})
