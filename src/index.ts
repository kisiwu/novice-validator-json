import { ErrorRequestHandler, RequestHandler, Request } from '@novice1/routing';
import Logger from '@novice1/logger';
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core';
import { IncomingHttpHeaders } from 'http';
import Ajv, { Options } from 'ajv'
import { SomeJSONSchema } from 'ajv/dist/types/json-schema';

const Log = Logger.debugger('@novice1/validator-json'); const PARAMETERS_PROPS = ['params', 'body', 'query', 'headers', 'cookies', 'files'];

interface ValidationObject {
    params?: ParamsDictionary;
    body?: unknown;
    query?: ParsedQs;
    headers?: IncomingHttpHeaders;
    cookies?: unknown;
    files?: unknown;
}

function retrieveParametersValue(parameters?: Record<string, unknown>, property?: string): Record<string, unknown> | null {
    let schemaFromParameters: Record<string, unknown> | null = null;
    if (
        parameters &&
        typeof parameters === 'object'
    ) {
        schemaFromParameters = parameters;
        if (property && typeof property === 'string') {
            // retrieve nested object property
            const subParameters = property.replace(/\[([^[\]]*)\]/g, '.$1.')
                .split('.')
                .filter((t) => t !== '')
                .reduce((prev: unknown, curr) => {
                    if (prev && typeof prev === 'object' && curr in prev) {
                        const tmp: unknown = prev[curr as keyof typeof prev]
                        return tmp
                    }
                    return
                }, schemaFromParameters);
            if (
                subParameters &&
                typeof subParameters === 'object' &&
                !Array.isArray(subParameters)
            ) {
                schemaFromParameters = subParameters as Record<string, unknown>;
            } else {
                schemaFromParameters = null;
            }
        }
    } 
    return schemaFromParameters;
}

function retrieveSchema(parameters?: Record<string, unknown>, property?: string): object | null {
    const v = retrieveParametersValue(parameters, property);
    if (v) {
        if (!('type' in v && v.type == 'object' && 'properties' in v)) {
            const props: Record<string, object> = {}
            for (const p of PARAMETERS_PROPS) {
                if (v[p] && typeof v[p] === 'object') {
                    props[p] = v[p]
                }
            }
            return {
                type: 'object',
                properties: v
            }
        }
    }
    return v
}

function buildValueToValidate(schema: object, req: Request): ValidationObject {
    const r: ValidationObject = {};    //'params', 'body', 'query', 'headers', 'cookies', 'files'
    if ('properties' in schema && schema.properties && typeof schema.properties === 'object') {
        const properties = schema.properties
        if ('params' in properties) {
            r.params = req.params;
        }
        if ('body' in properties) {
            r.body = req.body;
        }
        if ('query' in properties) {
            r.query = req.query;
        }
        if ('headers' in properties) {
            r.headers = req.headers;
        }
        if ('cookies' in properties) {
            r.cookies = req.cookies;
        }
        if ('files' in properties) {
            r.files = req.files;
        }
    }
    return r;
}

export type ValidatorJsonSchema = SomeJSONSchema | {
    body?: SomeJSONSchema | { [x: string]: SomeJSONSchema }
    headers?: SomeJSONSchema | { [x: string]: SomeJSONSchema }
    cookies?: SomeJSONSchema | { [x: string]: SomeJSONSchema }
    params?: SomeJSONSchema | { [x: string]: SomeJSONSchema }
    query?: SomeJSONSchema | { [x: string]: SomeJSONSchema }
    files?: SomeJSONSchema | { [x: string]: SomeJSONSchema }
}

export function validatorJson(
    options?: Options,
    onerror?: ErrorRequestHandler,
    schemaProperty?: string
): RequestHandler {
    const defaultAjv = new Ajv(options)
    return function validatorJsonRequestHandler(req, res, next) {
        const schema = retrieveSchema(req.meta?.parameters, schemaProperty);
        if (!schema) {
            Log.silly('no schema to validate');
            return next();
        }
        const values = buildValueToValidate(schema, req);
        Log.info('validating %O', values); 
        const ajv = req.meta.parameters?.validatorJsonOptions ? new Ajv(req.meta.parameters?.validatorJsonOptions) : defaultAjv
        const validate = ajv.compile(schema.valueOf())
        const valid = validate(values)
        if (!valid) {
            Log.error('Invalid request for %s', req.originalUrl);
            const { errors } = validate
            const err = { errors }
            if (typeof req.meta.parameters?.onerror === 'function') {
                Log.error(
                    'Custom function onerror => %s',
                    req.meta.parameters.onerror.name
                );
                return req.meta.parameters.onerror(err, req, res, next);
            }
            if (onerror) {
                if (typeof onerror === 'function') {
                    Log.error('Custom function onerror => %s', onerror.name);
                    return onerror(err, req, res, next);
                } else {
                    Log.warn(
                        'Expected arg 2 ("onerror") to be a function (ErrorRequestHandler). Instead got type "%s"',
                        typeof onerror
                    );
                }
            }
            return res.status(400).json(err);
        } 
        Log.info('Valid request for %s', req.originalUrl);
        return next();
    }
}