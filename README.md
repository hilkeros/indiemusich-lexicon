# indiemusi.ch Lexicon

This is a prototype and a first proposal on how to represent and save music and
its metadata on the AT Protocol. We see a lot of potential in giving artists the
power to host their tracks on their personal PDS, from where music and streaming
services can consume it to offer services to music listeners.

The suggested lexicons are routed in the practice of a cooperative of musicians,
[Red Brick Records](https://www.redbrickrecords.ch/), who release their own
music with a DIY attitude combined with a solid administrative setup. A good
understanding about copyright and master recording royalties leads to well
maintained and clean data and helps collecting the financial rewards of
releasing music.

We propose a set of lexicons that:

- invites to upload music with clean and complete royalties data
- makes a clear distinction between the copyright of the song and te master
  rights of the recording of that song
- includes music industry standard metadata like ISRC ISWC, IPI, GTIN, etc.
- makes it possible to connect all royalty owners with theit ATProto dids

Future ideas:

- flows for rights owners and copyright collecting societies to confirm and
  verify the correctness of the registered data
- uploading audio files: we would like to avoid unfair use of music and would
  suggest encryption of the audio files on the PDS. Artists would register their
  music with streaming providers by exchanging encryption/decryption keys with
  them over the AT Protocol. Streaming providers can offer different business
  models to artists and artists would choose on which providers they want to
  offer their tracks. Streaming providers can have trust that there is no
  copyright infringement on the uploaded tracks, by reading the verification and
  confirmation data or labels by copyright owners and collecting societies.

## The App


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
