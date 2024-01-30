# effect-workshop

## REQUIREMENTS:

### NodeJS 20

Hopefully you already have this, if not you can install at https://nodejs.org/en

### (Optional) Bun

I'm using bun just because its half a second faster to run typescript than with `tsx` or `ts-node`
If you want to also use bun you can install it at https://bun.sh/docs/installation

### Install JS Dependecies

```bash
npm i
yarn i
pnpm i
bun i
```

### Jupyter Notebook

You need python 3 for this, if you don't have it already you can install it at https://www.python.org/downloads/

```bash
pip install jupyter
```

### Typescript Jupyter Kernel

We will use `tslab`, to install:
```bash
npm install -g tslab
```

then
```bash
tslab install
```

to confirm
```bash
jupyter kernelspec list
```
```
Available kernels:
  jslab      /usr/local/google/home/yunabe/.local/share/jupyter/kernels/jslab
  tslab      /usr/local/google/home/yunabe/.local/share/jupyter/kernels/tslab
```