# @novice1/validator-json

[Ajv](https://www.npmjs.com/package/ajv) JSON schema validator () to use with [@novice1/routing](https://www.npmjs.com/package/@novice1/routing).

It provides a middleware that can validate the properties `params`, `body`, `query`, `headers`, `cookies` and `files` from the request using [Ajv](https://www.npmjs.com/package/ajv) validation.

## Installation

```bash
npm install @novice1/validator-json
```

## Usage

Example:

Using `fluent-json-schema` to create the JSON schema (draft-07) is optional but convenient.

```js
const router = require('@novice1/routing')()
const S = require('fluent-json-schema')
const { validatorJson } = require('@novice1/validator-json')
const express = require('express')

/**
 * It will validate the  properties "params", "body", "query", "headers", "cookies" and "files"
 * from the request with the route parameters.
 *
 */
router.setValidators(
  validatorJson(
    // ajv options
    { allErrors: true },
    // middleware in case validation fails
    function onerror(err, req, res, next) {
      res.status(400).json(err)
    }
  )
)

router.post(
  {
    name: 'Post app',
    path: '/app',

    parameters: S.object()
      .prop('body', S.object().prop('name', S.string().required().minLength(1)))
      .required()
      .valueOf(),

    // body parser
    preValidators: express.json()
  },
  function (req, res) {
    res.json(req.body.name)
  }
)

router.get(
  {
    name: 'Main app',
    path: '/app',
    parameters: {
      query: S.object()
        .prop(
          'version',
          S.string()
            .description('version number')
            .maxLength(1)
            .enum(['1', '2', '3'])
            .default('2')
            .examples(['2'])
        )
        .valueOf()
    }
  },
  function (req, res) {
    res.json(req.query.version)
  }
)
```

## Good practices

### ValidationProperty

Too keep the parameters of your routes clean, you should define your schemas in a property of the route `parameters`.

You just need to initiate the validator with the name of the property:

```ts
router.setValidators(
  validatorJson(
    // ajv options
    {},
    // middleware in case validation fails
    undefined,
    // name of the property in 'parameters'
    'jsonSchemas'
  )
)
```

Then in your routes you can do:

```ts
router.get(
  {
    name: 'Main app',
    path: '/app',
    parameters: {
      // property 'jsonSchemas'
      jsonSchemas: {
        query: S.object()
          .prop(
            'version',
            S.string()
              .description('version number')
              .maxLength(1)
              .enum(['1', '2', '3'])
              .default('2')
              .examples(['2'])
          )
          .valueOf()
      }
    }
  },
  function (req, res) {
    res.json(req.query.version)
  }
)
```

## References

- [Ajv](https://www.npmjs.com/package/ajv)
- [@novice1/routing](https://www.npmjs.com/package/@novice1/routing)
