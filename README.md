# @novice1/validator-json

JSON schema validator to use with [@novice1/routing](https://www.npmjs.com/package/@novice1/routing).

It provides a middleware that can validates `req.params`, `req.body`, `req.query`, `req.headers`, `req.cookies` and `req.files` against a schema using [Ajv](https://www.npmjs.com/package/ajv).

## Installation

```bash
npm install @novice1/validator-json
```

## Usage

### With Typescript interfaces

Typescript interfaces are optional but convenient as they can help defining the JSON schema and be used in the controller.

```ts
import routing from '@novice1/routing'
import express from 'express'
import { validatorJson } from '@novice1/validator-json'
import { JSONSchemaType } from 'ajv'

const router = routing()

/**
 * Enable JSON validation on: 
 * - req.params
 * - req.body
 * - req.query
 * - req.headers
 * - req.cookies
 * - req.files
 * 
 * for that router
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

// interface for "req.body"
interface PostBody {
    name: string
}

// JSON schema for "req.body"
const bodySchema: JSONSchemaType<PostBody> = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1
        }
    },
    required: ['name'],
    additionalProperties: false
}

router.post(
  {
    name: 'Post app',
    path: '/app',

    // the schema to validate
    parameters: {
      type: 'object',
      properties: {
          body: bodySchema
      },
      required: ['body'],
      additionalProperties: true
    },

    // body parser
    preValidators: express.json()
  },
  function (req, res) {
    res.json(req.body.name)
  }
)

// interface for "req.query"
interface GetQuery {
    version?: string
}

// JSON schema for "req.query"
const querySchema: JSONSchemaType<GetQuery> = {
    type: 'object',
    properties: {
        version: {
            type: 'string',
            description: 'version number',
            enum: ['1','2','3'],
            default: '2',
            examples: ['2'],
            nullable: true
        }
    }
}

router.get(
  {
    name: 'Main app',
    path: '/app',
    parameters: {
      // the schema to validate
      query: querySchema
    }
  },
  function (req, res) {
    res.json(req.query.version)
  }
)
```

### Using `fluent-json-schema`

```js
import routing from '@novice1/routing'
import express from 'express'
import { S } from 'fluent-json-schema'
import { validatorJson } from '@novice1/validator-json'

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

## Best practices

### Validation property

To keep your schemas "isolated" from other properties of `parameters`, you should define one property that will contain those schemas.

To do that you just need to initiate the validator with the name of the property:

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
    // parameters
    parameters: {
      // property 'jsonSchemas'
      jsonSchemas: {
        query: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              description: 'version number',
              enum: ['1','2','3'],
              default: '2',
              examples: ['2'],
              nullable: true
            }
          }
        }
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
