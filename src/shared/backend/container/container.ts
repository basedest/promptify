import 'server-only';

type ServiceToken = symbol;
type Factory<T> = () => T;

/**
 * Simple DI container with lazy singleton resolution.
 * Nest.js-style token-based registration.
 */
export class Container {
    private readonly factories = new Map<ServiceToken, Factory<unknown>>();
    private readonly instances = new Map<ServiceToken, unknown>();

    register<T>(token: ServiceToken, factory: Factory<T>): this {
        this.factories.set(token, factory as Factory<unknown>);
        return this;
    }

    resolve<T>(token: ServiceToken): T {
        const instance = this.instances.get(token);
        if (instance !== undefined) {
            return instance as T;
        }
        const factory = this.factories.get(token);
        if (!factory) {
            throw new Error(`No provider registered for token: ${String(token)}`);
        }
        const created = factory() as T;
        this.instances.set(token, created);
        return created;
    }

    /**
     * Create a child container with the same bindings (for request-scoped overrides if needed).
     */
    createChild(): Container {
        const child = new Container();
        for (const [token, factory] of this.factories) {
            child.factories.set(token, factory);
        }
        return child;
    }
}
