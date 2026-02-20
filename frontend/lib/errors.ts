// Custom error types for specific auth scenarios
export class EmailNotVerifiedError extends Error {
    constructor() {
        super('Please verify your email address before signing in. Check your inbox for a verification link.');
        this.name = 'EmailNotVerifiedError';
    }
}

export class AccountDisabledError extends Error {
    constructor() {
        super('Your account has been disabled. Please contact support for assistance.');
        this.name = 'AccountDisabledError';
    }
}

export class TooManyAttemptsError extends Error {
    constructor() {
        super('Too many sign-in attempts. Please wait a few minutes before trying again.');
        this.name = 'TooManyAttemptsError';
    }
}

export class InvalidCredentialsError extends Error {
    constructor() {
        super('Invalid email or password. Please check your credentials and try again.');
        this.name = 'InvalidCredentialsError';
    }
}
