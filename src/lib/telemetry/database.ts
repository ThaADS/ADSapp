/**
 * Database Query Tracing
 *
 * Instruments Supabase database queries with distributed tracing
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { traceDbQuery } from './middleware'
import { recordDatabaseQuery, recordDatabaseError, MetricAttributes } from './metrics'

/**
 * Wrap Supabase client with tracing
 */
export function createTracedSupabaseClient(client: SupabaseClient) {
  // Create proxy to intercept query methods
  return new Proxy(client, {
    get(target, prop) {
      const original = target[prop as keyof typeof target]

      // Only wrap specific query methods
      if (prop === 'from') {
        return function (tableName: string) {
          const queryBuilder = (original as any).call(target, tableName)
          return wrapQueryBuilder(queryBuilder, tableName)
        }
      }

      if (prop === 'rpc') {
        return async function (fnName: string, params?: any) {
          const startTime = Date.now()
          return traceDbQuery('rpc', fnName, async () => {
            const result = await (original as any).call(target, fnName, params)
            const duration = Date.now() - startTime
            recordDatabaseQuery(duration, {
              operation: 'rpc',
              function: fnName,
            })
            return result
          })
        }
      }

      return original
    },
  })
}

/**
 * Wrap query builder methods with tracing
 */
function wrapQueryBuilder(queryBuilder: any, tableName: string) {
  const operations = ['select', 'insert', 'update', 'delete', 'upsert']

  operations.forEach(operation => {
    const original = queryBuilder[operation]
    if (original) {
      queryBuilder[operation] = function (...args: any[]) {
        const result = original.apply(this, args)

        // Wrap the final execution methods
        const executionMethods = ['single', 'maybeSingle', 'then', 'catch']
        executionMethods.forEach(method => {
          if (result[method]) {
            const originalMethod = result[method]
            result[method] = async function (...methodArgs: any[]) {
              const startTime = Date.now()

              try {
                const execResult = await traceDbQuery(
                  operation,
                  tableName,
                  () => originalMethod.apply(result, methodArgs),
                  {
                    'db.table': tableName,
                    'db.operation': operation,
                  }
                )

                const duration = Date.now() - startTime
                const attributes: MetricAttributes = {
                  operation,
                  table: tableName,
                }
                recordDatabaseQuery(duration, attributes)

                return execResult
              } catch (error) {
                const duration = Date.now() - startTime
                const attributes: MetricAttributes = {
                  operation,
                  table: tableName,
                  errorType: error instanceof Error ? error.name : 'UnknownError',
                }
                recordDatabaseQuery(duration, attributes)
                recordDatabaseError(attributes)
                throw error
              }
            }
          }
        })

        return result
      }
    }
  })

  return queryBuilder
}

/**
 * Manual query tracing helper
 */
export async function traceQuery<T>(
  operation: string,
  tableName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await traceDbQuery(operation, tableName, queryFn)

    const duration = Date.now() - startTime
    recordDatabaseQuery(duration, {
      operation,
      table: tableName,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    recordDatabaseQuery(duration, {
      operation,
      table: tableName,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    recordDatabaseError({
      operation,
      table: tableName,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    throw error
  }
}
