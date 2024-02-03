---
theme: default
title: Effect Beginner/Intermediate Workshop
author: Ethan Niser
lineNumbers: false
record: false
highlighter: shikiji
drawings:
  persist: false
info: |
  ## Effect Beginner/Intermediate Workshop

  An interactive introduction to [Effect](https://effect.website)

  [Ethan Niser](https://twitter.com/ethanniser) at [Effect Days 2024](https://effect.website/events/effect-days)
---

# Effect Beginner/Intermediate Workshop

An interactive introduction to [Effect](https://effect.website)

<div class="uppercase text-sm tracking-widest">
Ethan Niser
</div>

<div class="abs-bl mx-14 my-12 flex flex-col space-y-4">
  <img src="https://assets-global.website-files.com/65001a5c49ae13d89bb13849/659aaccb97095198128858fd_effect-days-white.svg" class="h-8">
    <div class="text-sm opacity-50">Feb. 22nd, 2024</div>
</div>

---

```yaml
layout: "intro"
```

# Ethan Niser

<div class="leading-8 opacity-80">
Content Creator<br>
Author of The BETH Stack and next-typesafe-url<br>
<span v-click>Full time high school student</span><br>
</div>

<div class="my-10 flex flex-col space-y-5">
  <div class="flex items-center space-x-4">
    <ri-youtube-line class="opacity-50 text-2xl"/>
    <div><a href="https://youtube.com/@ethanniser" target="_blank">@ethannniser</a></div>
  </div>
  <div class="flex items-center space-x-4">
    <ri-twitter-line class="opacity-50 text-2xl"/>
    <div><a href="https://twitter.com/ethanniser" target="_blank">@ethanniser</a></div>
  </div>
  <div class="flex items-center space-x-4">
    <ri-github-line class="opacity-50 text-2xl"/>
    <div><a href="https://github.com/ethanniser" target="_blank">ethanniser</a></div>
  </div>
</div>

<!-- TODO: get better quality image -->
<img src="/kasumi_pfp.png" class="rounded-full w-50 abs-tr mt-16 mr-12"/>

---

```yaml
layout: two-cols
```

<Tweet id="1670980472057241601" cards="hidden"/>
::right::
<Tweet id="1671230834869665809"/>

<!--
I don't remember how I found effect, but I first discovered it back in June of last year, and was basically blown away from day 1
-->

---

```yaml
layout: statement
```

# Effect makes our programs easier to understand

<!--
Fundamentally, Effect's biggest factor is that it makes our programs easier to understand.
The result of that is all of the big words you see on the home page right: 'safer', 'more compoasable', 'more observable'.

These are all great things, but the core of it is a framework that allows us to program in a way that is **easier to understand**
-->

---

# Agenda

  <v-clicks>
  
  - Introduction to core Effect concepts
  - Real world examples by rewriting two apps
  - A peek into 'advanced' Effect
  
  </v-clicks>

---

```yaml
layout: fact
```

## Do your best to not feel _overwhelmed_

<!--
Effect can be quite overwhelming, you go to the api reference site and start scrolling, and then you dont stop scrolling
Theres a lot, but what I want to do my best to make sure you understand right now at the start is that the learning curve is quite gentle. There are many modules and functions that you could go years using Effect and never touch.

And to get started, you really only need to understand a few core concepts
Today I'm gonna do my best to give you a good understanding of those core concepts, and some little dips of some of the other stuff
 -->

---

```yaml
layout: center
class: text-center
```

# Interactivity

##### Please ask questions!

<!--
Something that is really important today is interactivity. I've planned in spots for review problems and breakouts, but I want to make sure you all feel comfortable prompting the interaction as well.

 - If you have a question or comment at any time, please ask it

with that said, let's get started
-->

---

```yaml
layout: section
```

# What is an 'Effect'?

---

# What is an 'Effect'?

<v-clicks>
  
  - "Something brought about by a cause or agent"
  - Side effects?
  - The `Effect` type
  
</v-clicks>

---

```yaml
layout: quote
```

> “an `Effect` is a description of a program that is lazy and immutable”
