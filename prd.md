Below is the **updated production-ready PRD** in Markdown format. This version includes all the improvements we discussed:

* GitHub deployment removal
* Base Theme Blueprint Engine
* Theme Compiler
* AI understanding product + theme structure
* Preview before apply
* Dashboard visual editor
* Drag-and-drop sections
* AI chat modification
* Job tables
* Asset tables
* Rollback system
* Version history
* Realtime progress
* BullMQ flow orchestration
* Production safety guardrails
* Merchant approval workflow

---

# Enterprise AI Shopify Theme Builder

## Final Production PRD

---

# Vision

Build an AI-native Shopify theme generation platform that creates high-converting landing pages while preserving the structure and design language of the base theme.

The system should behave like an intelligent design assistant rather than generating arbitrary layouts.

---

# Core Principles

### 1. Base Theme First

AI should never generate completely random layouts.

Everything must inherit from:

* Existing sections
* Existing blocks
* Theme settings
* Typography system
* Colors
* CSS variables
* Section schemas

AI enhances the theme.

AI never replaces the architecture.

---

# End-to-End Flow

Merchant

↓

Select Product

↓

Select Style Preset

↓

Create Project

↓

Provision Draft Theme

↓

Analyze Product

↓

Analyze Base Theme

↓

AI Generation

↓

Compile Theme

↓

Validation

↓

Preview Dashboard

↓

Merchant Edits

↓

AI Chat Modifications

↓

Merchant Approval

↓

Apply To Existing Theme

↓

Theme Backup

↓

Version Snapshot

↓

Publish

---

# Stage 1 — Product Understanding

AI analyzes:

### Product

* category
* niche
* colors
* variants
* materials
* audience

### Store

* brand colors
* typography
* tone
* spacing

### Theme

* sections
* blocks
* schemas
* CSS variables
* settings_data.json

---

# Base Theme Blueprint Engine

Before generation:

Create a complete blueprint.

Store:

```json
{
  "sections":[],
  "blocks":[],
  "fonts":[],
  "colors":[],
  "css_variables":[],
  "settings":[],
  "spacing_rules":[],
  "radius_rules":[]
}
```

AI generation always references this blueprint.

---

# AI Agents

## Vision Agent

Responsible for:

* niche detection
* product analysis
* color extraction

---

## Copy Agent

Creates:

* headlines
* benefits
* FAQ
* CTA
* SEO copy

---

## Image Agent

Creates:

* hero banners
* lifestyle images
* collection graphics

---

## Layout Agent

Determines:

* section order
* spacing
* hierarchy

---

## Theme Compiler Agent

Creates:

* index.json
* section settings
* css variables
* settings_data.json

---

## Validation Agent

Checks:

* schema errors
* broken assets
* unsupported blocks

---

# BullMQ Flow

Vision Worker

↓

Copy Worker

↓

Image Worker

↓

Layout Worker

↓

Theme Compiler Worker

↓

Upload Worker

↓

Validation Worker

↓

Preview Ready

---

# Database

## users_accounts

Store:

* shop domain
* tokens

---

## design_projects

Tracks:

* project status
* draft theme

---

## project_jobs

Tracks:

```sql
VISION
COPY
IMAGE
LAYOUT
COMPILER
UPLOAD
VALIDATION
```

Each job contains:

* status
* retries
* errors
* duration

---

## generated_assets

Stores:

* original image
* generated image
* Shopify file id
* CDN url

---

## theme_versions

Stores:

* version number
* snapshot
* created by AI
* created by merchant

---

## theme_backups

Stores:

Complete rollback state.

---

## brand_memory

Stores:

* typography
* colors
* spacing
* tone

Future generations become consistent.

---

# Theme Compiler Engine

Input:

```json
{
 product,
 assets,
 copy,
 style,
 blueprint
}
```

Output:

```json
{
 index_json,
 settings_data,
 css_variables,
 sections
}
```

Compiler controls all generation.

No AI directly edits theme files.

---

# Safety Layer

AI Output

↓

JSON Validation

↓

Schema Validation

↓

Asset Validation

↓

Section Validation

↓

Theme Validation

↓

Preview

Only valid themes proceed.

---

# Preview Dashboard

Merchant sees:

Generated page preview.

---

# Visual Editor

Merchant can:

* edit text
* edit images
* change colors
* rearrange sections
* enable blocks
* disable blocks

---

# Drag And Drop

Merchant can:

Add existing theme sections.

Examples:

* Hero
* Testimonials
* FAQ
* Image Banner
* Rich Text
* Featured Collection
* Video

---

# AI Chat Editor

Merchant can type:

> Make hero smaller

> Change colors to black

> Add FAQ section

> Add trust badges

AI modifies preview.

Changes remain inside preview.

Nothing touches live theme.

---

# Realtime Progress

Using:

Supabase Realtime

Merchant sees:

```text
Analyzing Product

Generating Assets

Uploading Images

Compiling Theme

Validating

Preview Ready
```

---

# Merchant Approval Workflow

Preview

↓

Merchant Reviews

↓

Manual Edits

↓

AI Chat Refinements

↓

Approve

↓

Apply Theme

---

# Existing Theme Update

Do not create a new live theme.

Update:

Already installed base theme.

Only:

* section settings
* assets
* blocks
* styles

are modified.

Core architecture remains untouched.

---

# Theme Version System

Every apply creates:

Version 1

Version 2

Version 3

Merchant can restore previous versions.

---

# Rollback Engine

Before every update:

Create backup.

If deployment fails:

Restore previous version automatically.

---

# API Structure

POST

```text
/api/projects/initiate
```

Start generation.

---

GET

```text
/ api/projects/status/:id
```

Progress.

---

GET

```text
/ api/projects/preview/:id
```

Preview.

---

POST

```text
/ api/projects/apply
```

Apply changes.

---

POST

```text
/ api/projects/chat
```

AI modification.

---

POST

```text
/ api/projects/version
```

Create version.

---

POST

```text
/ api/projects/rollback
```

Restore version.

---

# Failure Handling

Retry:

3 attempts

Exponential backoff

5s

10s

20s

Fallback assets are used if image generation fails.

---

# Production Guardrails

Maximum image size:

20MB

Maximum resolution:

20MP

Schema validation required.

Unsupported fonts blocked.

Broken sections blocked.

Missing assets blocked.

---

# Future V2

Multi-page generation

Collection pages

Product pages

Blog pages

Cart optimization

A/B testing

Heatmaps

Conversion analytics

AI CRO recommendations

Multilingual generation

Theme marketplace

---

# Architecture

Remix App

↓

NestJS API

↓

BullMQ

↓

Redis

↓

AI Agents

↓

Theme Compiler

↓

Validation Layer

↓

Preview Dashboard

↓

Merchant Approval

↓

Apply To Existing Theme

↓

Version History

↓

Rollback Engine

---

# Goal

An AI-native Shopify Theme Builder that behaves like a senior Shopify designer and CRO expert while preserving the merchant's existing base theme architecture.

This PRD is now **very close to production-grade architecture**. From here, the next step would be creating:

1. **Folder structure**
2. **Database schema (full SQL)**
3. **BullMQ flow architecture**
4. **NestJS modules**
5. **API contracts**
6. **Theme Compiler architecture**
7. **Cursor rules**
8. **Implementation roadmap (Phase 1 → Phase 10)**

Those documents together would form the complete engineering blueprint for development.
