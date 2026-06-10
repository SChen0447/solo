import yaml from 'js-yaml';
import _ from 'lodash';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  type?: string;
  schema?: any;
  example?: any;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: {
    [mediaType: string]: {
      schema?: any;
      example?: any;
      examples?: any;
    };
  };
}

export interface Response {
  statusCode: string;
  description?: string;
  content?: {
    [mediaType: string]: {
      schema?: any;
      example?: any;
      examples?: any;
    };
  };
}

export interface Endpoint {
  id: string;
  path: string;
  method: HttpMethod;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
}

export interface ParsedDocument {
  title: string;
  version?: string;
  description?: string;
  endpoints: Endpoint[];
  tags: { name: string; description?: string }[];
  endpointsByTag: { [tag: string]: Endpoint[] };
  rawSpec: any;
}

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

function resolveRef(spec: any, ref: string): any {
  if (!ref.startsWith('#/')) return undefined;
  const parts = ref.slice(2).split('/');
  let current = spec;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function resolveSchema(spec: any, schema: any): any {
  if (!schema) return schema;
  if (schema.$ref) {
    return resolveSchema(spec, resolveRef(spec, schema.$ref));
  }
  if (schema.allOf) {
    const resolved: any = { type: 'object', properties: {} };
    for (const sub of schema.allOf) {
      const resolvedSub = resolveSchema(spec, sub);
      if (resolvedSub?.properties) {
        resolved.properties = { ...resolved.properties, ...resolvedSub.properties };
      }
      if (resolvedSub?.type) {
        resolved.type = resolvedSub.type;
      }
    }
    return resolved;
  }
  if (schema.oneOf || schema.anyOf) {
    const arr = schema.oneOf || schema.anyOf;
    if (arr && arr.length > 0) {
      return resolveSchema(spec, arr[0]);
    }
  }
  if (schema.properties) {
    const resolved: any = { ...schema, properties: {} };
    for (const key of Object.keys(schema.properties)) {
      resolved.properties[key] = resolveSchema(spec, schema.properties[key]);
    }
    return resolved;
  }
  if (schema.items) {
    return { ...schema, items: resolveSchema(spec, schema.items) };
  }
  return schema;
}

function generateExampleFromSchema(schema: any): any {
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return '2024-01-15T10:30:00Z';
      if (schema.format === 'date') return '2024-01-15';
      if (schema.format === 'email') return 'example@email.com';
      if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      if (schema.format === 'uri') return 'https://example.com';
      if (schema.pattern) return 'string';
      return 'string';
    case 'integer':
      return schema.default ?? (schema.minimum ?? 1);
    case 'number':
      return schema.default ?? (schema.minimum ?? 1.0);
    case 'boolean':
      return schema.default ?? true;
    case 'null':
      return null;
    case 'array': {
      const itemExample = generateExampleFromSchema(schema.items);
      return [itemExample];
    }
    case 'object':
    default: {
      if (!schema.properties) return {};
      const result: any = {};
      const required = schema.required || [];
      for (const key of Object.keys(schema.properties)) {
        if (required.includes(key) || Math.random() > 0.3) {
          result[key] = generateExampleFromSchema(schema.properties[key]);
        }
      }
      return result;
    }
  }
}

function parseParameters(spec: any, params: any[] | undefined): Parameter[] {
  if (!params || !Array.isArray(params)) return [];
  return params.map((p: any) => {
    const resolved = p.$ref ? resolveRef(spec, p.$ref) : p;
    return {
      name: resolved.name,
      in: resolved.in,
      required: resolved.required || resolved.in === 'path',
      description: resolved.description,
      type: resolved.type || resolved.schema?.type,
      schema: resolveSchema(spec, resolved.schema),
      example: resolved.example ?? generateExampleFromSchema(resolveSchema(spec, resolved.schema))
    };
  });
}

function parseRequestBody(spec: any, body: any | undefined): RequestBody | undefined {
  if (!body) return undefined;
  const resolved = body.$ref ? resolveRef(spec, body.$ref) : body;
  const content: { [key: string]: any } = {};
  if (resolved.content) {
    for (const mediaType of Object.keys(resolved.content)) {
      const mediaContent = resolved.content[mediaType];
      content[mediaType] = {
        schema: resolveSchema(spec, mediaContent.schema),
        example: mediaContent.example ?? generateExampleFromSchema(resolveSchema(spec, mediaContent.schema)),
        examples: mediaContent.examples
      };
    }
  }
  return {
    description: resolved.description,
    required: resolved.required,
    content
  };
}

function parseResponses(spec: any, responses: any | undefined): Response[] {
  if (!responses) return [];
  const result: Response[] = [];
  for (const statusCode of Object.keys(responses)) {
    const resp = responses[statusCode];
    const resolved = resp.$ref ? resolveRef(spec, resp.$ref) : resp;
    const content: { [key: string]: any } = {};
    if (resolved.content) {
      for (const mediaType of Object.keys(resolved.content)) {
        const mediaContent = resolved.content[mediaType];
        content[mediaType] = {
          schema: resolveSchema(spec, mediaContent.schema),
          example: mediaContent.example ?? generateExampleFromSchema(resolveSchema(spec, mediaContent.schema)),
          examples: mediaContent.examples
        };
      }
    }
    result.push({
      statusCode,
      description: resolved.description,
      content
    });
  }
  return result;
}

export function parseDocument(content: string, format: 'yaml' | 'json' = 'yaml'): ParsedDocument {
  let spec: any;
  try {
    if (format === 'yaml') {
      spec = yaml.load(content);
    } else {
      spec = JSON.parse(content);
    }
  } catch (e: any) {
    throw new Error(`文档解析失败: ${e.message}`);
  }

  if (!spec || typeof spec !== 'object') {
    throw new Error('文档格式无效');
  }

  const isOpenApi3 = !!spec.openapi;
  const isSwagger2 = !!spec.swagger;

  if (!isOpenApi3 && !isSwagger2) {
    throw new Error('不支持的文档格式，请提供 OpenAPI 3.x 或 Swagger 2.x 文档');
  }

  const endpoints: Endpoint[] = [];
  const paths = spec.paths || {};
  const tags: { name: string; description?: string }[] = spec.tags || [];
  const tagNames = tags.map((t: any) => t.name);

  for (const path of Object.keys(paths)) {
    const pathItem = paths[path];
    if (!pathItem || typeof pathItem !== 'object') continue;

    const pathParams = parseParameters(spec, pathItem.parameters);

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;

      const opParams = parseParameters(spec, operation.parameters);
      const allParams = _.uniqBy([...pathParams, ...opParams], (p: Parameter) => `${p.in}:${p.name}`);

      const opTags = operation.tags || [];
      for (const t of opTags) {
        if (!tagNames.includes(t)) {
          tags.push({ name: t });
          tagNames.push(t);
        }
      }

      const endpoint: Endpoint = {
        id: `${method}:${path}`,
        path,
        method: method as HttpMethod,
        summary: operation.summary,
        description: operation.description,
        tags: opTags,
        parameters: allParams,
        requestBody: parseRequestBody(spec, operation.requestBody),
        responses: parseResponses(spec, operation.responses)
      };

      endpoints.push(endpoint);
    }
  }

  const endpointsByTag: { [tag: string]: Endpoint[] } = {};
  for (const endpoint of endpoints) {
    const tagKey = endpoint.tags.length > 0 ? endpoint.tags[0] : 'default';
    if (!endpointsByTag[tagKey]) {
      endpointsByTag[tagKey] = [];
    }
    endpointsByTag[tagKey].push(endpoint);
  }

  if (!endpointsByTag['default'] && tags.length === 0) {
    tags.push({ name: 'default' });
  }

  return {
    title: spec.info?.title || 'API Document',
    version: spec.info?.version,
    description: spec.info?.description,
    endpoints,
    tags,
    endpointsByTag,
    rawSpec: spec
  };
}

export function generateMockResponse(endpoint: Endpoint, statusCode: string = '200'): { status: number; data: any; time: number } {
  const startTime = performance.now();
  const response = endpoint.responses.find(r => r.statusCode === statusCode || r.statusCode === String(parseInt(statusCode)));
  const fallbackResponse = endpoint.responses.find(r => r.statusCode.startsWith('2')) || endpoint.responses[0];
  const target = response || fallbackResponse;

  let data: any = { message: 'No response defined' };
  if (target?.content) {
    const jsonContent = target.content['application/json'] || Object.values(target.content)[0];
    if (jsonContent) {
      data = jsonContent.example ?? generateExampleFromSchema(jsonContent.schema);
    }
  }

  const status = parseInt(statusCode) || 200;
  const elapsed = Math.round(performance.now() - startTime) + Math.floor(Math.random() * 20) + 5;

  return { status, data, time: elapsed };
}

export function generateDefaultRequestBody(endpoint: Endpoint): any {
  if (!endpoint.requestBody?.content) return {};
  const jsonContent = endpoint.requestBody.content['application/json'] || Object.values(endpoint.requestBody.content)[0];
  if (!jsonContent) return {};
  return jsonContent.example ?? generateExampleFromSchema(jsonContent.schema);
}
