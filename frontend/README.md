# Getting started with this Next.js Project

## !!!IMPORTANT!!!

This commit means, this code is still in development and very unstable!

## Todo

- Add custom error and not found pages
- Migrate old pages
- Test jwt authentication through middleware to the backend

## How next.js works

### SSR

Server-side-rendering is the most popular reason to use next.js.
Next.js always renders every component and page from serverside.

If you need to access to the client, for example if you use `React.useState` or `React.useEffect` (just to name a few), you'll need to place `use client;` at the very top of the component's file.
Otherwise the component won't render and next.js will cry about it ;)

### App Router

Every directory in the `app` directory which has a `page.tsx` file included will be a route in the frontend.

The `api` directory is a special dir where the next.js backend could be included or the next-auth authentication.

The next-auth authentication is outsourced in `/src/lib/auth.ts`.
There is the whole login logic with jwt and session generation.

Creating a React Context is a way to handle Notifications globally.
In `/src/lib/context` you'll find `NotificationContext.tsx` with a `useNotification()`-Hook. Use it like this:

```ts
const { showNotification } = useNotification();

showNotification("This is the notification message!", "success");
```

Use this whereever you want and you can access the MUI Snackbar with the alerts.

### Authentication

As mentioned, I use the [next-auth](https://next-auth.js.org/) library for authentication.

In addition to the custom credentials we use in this project, next-auth has many other providers, such as github, apple, google, discord, etc.

We need to create a secret key in our `.env.*.local` with the name `NEXTAUTH_SECRET`, otherwise next-auth will throw an error in production. It need's the key for generating secrets/tokens.

### Environment Variables

Every env variable which starts with `NEXT_PUBLIC_*` can be accessed in the frontend via `process.env.NEXT_PUBLIC_*`.

To be on the safe side, please add each `.env.*.local` file to the `.gitignore`.

On the other hand, you can include all `.env` files without local in their name in the repository.
