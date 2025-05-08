# @novice1/validator-json

JSON schema validator to use with [@novice1/routing](https://www.npmjs.com/package/@novice1/routing).

It provides a middleware that can validate `req.params`, `req.body`, `req.query`, `req.headers`, `req.cookies` and `req.files` against a schema using [Ajv](https://www.npmjs.com/package/ajv).

## Installation

```bash
npm install @novice1/validator-json
```

## Usage

### Set validator

```ts
// router.ts

import routing from '@novice1/routing'
import { validatorJson } from '@novice1/validator-json'

export default const router = routing()

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
    { allErrors: true, keywords: ['meta', 'discriminator'] },
    // middleware in case validation fails
    function onerror(err, req, res, next) {
      res.status(400).json(err)
    }
  )
)
```

### With Typescript interfaces

Typescript interfaces are optional but convenient as they can help defining the JSON schema and be used in the controller.

```ts
import express from 'express'
import { JSONSchemaType } from 'ajv'
import router from './router'

// interface for "req.body"
interface BodyItem {
    name: string
}

// JSON schema for "req.body"
const bodySchema: JSONSchemaType<BodyItem> = {
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
    name: 'Post item',
    path: '/items',

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
  function (req: routing.Request<unknown, { name: string }, BodyItem>, res) {
    res.json({ name: req.body.name })
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
    res.send(req.query.version)
  }
)
```

### With `@sinclair/typebox`

```ts
import express from 'express'
import { Type, Static } from '@sinclair/typebox'
import routing from '@novice1/routing'
import router from './router'

// schema for "req.body"
const bodySchema = Type.Object({                
  name: Type.String()                            
})

// type for "req.body"
type BodyItem = Static<typeof bodySchema>

router.post(
  {
    name: 'Post item',
    path: '/items',

    // the schema to validate
    parameters: Type.Object({
      body: bodySchema
    }),

    // body parser
    preValidators: express.json()
  },
  function (req: routing.Request<unknown, { name: string }, BodyItem>, res) {
    res.json({ name: req.body.name })
  }
)

// schema for "req.query"
const querySchema = Type.Object({
    version: Type.Optional(
      Type.Union([
        Type.Literal('1'),
        Type.Literal('2'),
        Type.Literal('3')
      ], {
        type: 'string',
        default: '2',
        description: 'version number',
        examples: ['2']
      })
    )                    
})

// type for "req.query"
type GetQuery = Static<typeof querySchema>

router.get(
  {
    name: 'Main app',
    path: '/app',
    parameters: {
      // the schema to validate
      query: querySchema
    }
  },
  function (req: routing.Request<unknown, string, unknown, GetQuery>, res) {
    res.send(req.query.version)
  }
)
```

### With `fluent-json-schema`

```ts
import express from 'express'
import { S } from 'fluent-json-schema'
import routing from '@novice1/routing'
import router from './router'

router.post(
  {
    name: 'Post item',
    path: '/items',

    parameters: S.object()
      .prop('body', S.object().prop('name', S.string().required().minLength(1)))
      .required()
      .valueOf(),

    // body parser
    preValidators: express.json()
  },
  function (req, res) {
    res.json({ name: req.body.name })
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
    res.send(req.query.version)
  }
)
```

### Overrides

Override the validator's options and the error handler for a route.

```ts
import routing from '@novice1/routing'
import { validatorJson } from '@novice1/validator-json'
import Logger from '@novice1/logger'
import { Options } from 'ajv'

const router = routing()

router.setValidators(
  validatorJson(
    // default options
    { allErrors: true, keywords: ['meta', 'discriminator'] },
    // default error handler
    function onerror(err, req, res, next) {
      res.status(400).json(err)
    }
  )
)

const onerror: routing.ErrorRequestHandler = (err, req, res) => {
  res.status(400).json(err)
}

const validatorJsonOptions: Options = { logger: Logger, allErrors: false }

router.get(
  {
    path: '/override',
    parameters: {
      // overrides
      onerror, 
      validatorJsonOptions

    },
  },
  function (req, res) {
    // ...
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
    'schema'
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
      // property 'schema'
      schema: {
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
