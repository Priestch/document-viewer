# Acknowledge

> There are critical comments about the PDF.js project, they say it should be easier to integrate the default
> viewer. I understand them somehow as a developer who want to show a PDF quickly, but knowing the primary goal
> of an OSS project can help us to understand the trade-off decisions made by the maintainers.
>
> All these are what I learned from the PDF.js project. It may not be accurate, but I hope it can help you to understand the PDF.js better.

# Table of Contents

[[toc]]

## Background Introduction

[PDF.js](https://github.com/mozilla/pdf.js) is an OSS project supported by Mozilla and developed using HTML5,
It's goal is to create a general-purpose, web standards-based platform for rendering PDFs in the **Firefox browser**. Many people find out that it's hard to integrate it into project, it's [somehow intentionally](#issues-talked-about-why-it-s-hard-to-integrate).

It's not developed as a component or library you can easily integrate like most npm packages, because it's
primary goal is to be used easily in **Firefox browser**, the goal doesn't match most developers expectations.
It's the trade-off decision made by the maintainers, we should understand it.

#### Issues talked about why it's not easy to integrate

- [Issue 5609](https://github.com/mozilla/pdf.js/issues/5609#issuecomment-68530552)
- [Issue 9210](https://github.com/mozilla/pdf.js/issues/9210#issuecomment-347834276)
- [Issue 7203](https://github.com/mozilla/pdf.js/issues/7203#issuecomment-210510569)

## PDFViewerApplication

<!--@include: ./parts/application.md-->

## AppOptions

<!--@include: ./parts/app-options.md-->

## Import Events

<!--@include: ./parts/events.md-->
