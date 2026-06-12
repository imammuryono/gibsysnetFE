# Changelog Conventions

> **Status**: `Approved` | **Pemilik**: System Analyst | **Terakhir Update**: 2026-06-12

## 1. Format
    ## [1.0.1] - 2026-06-12

    ### Fixed
    - [detail]

    ### Added
    - [detail]

    ### Changed
    - [detail]

    ### Removed
    - [detail]

## 2. Version Numbering (Semantic Versioning)
**MAJOR.MINOR.PATCH**
- **MAJOR**: Breaking changes (API contract change, data model change).
- **MINOR**: New features (new endpoint, new page, new module).
- **PATCH**: Bug fixes, minor improvements.

## 3. Commit Message Convention (Conventional Commits)
    <type>(<scope>): <subject>

**Type:**
- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `style`: formatting, no code change
- `refactor`: code change that neither fixes bug nor adds feature
- `test`: add/modify tests
- `chore`: build tool, dependency update

**Example:**
    feat(cob): add soft delete panel
    fix(class-construction): handle null class_name_eng
    docs(SOT_driven): add initial PRD

## 4. Changelog Template
    # Changelog - GIBSYSNET

    All notable changes to this project will be documented in this file.

    The format is based on [Keep a Changelog](https://keepachangelog.com/),
    and this project adheres to [Semantic Versioning](https://semver.org/).

    ## [Unreleased]

    ### Added
    ### Fixed
    ### Changed
    ### Removed

    ## [1.0.0] - 2026-06-12

    ### Added
    - Initial release with master data CRUD modules.
    - COB, Sub-COB, Currency, Partners, Class Construction.
    - Risk models: Vehicle, Property, Vessel, Engineering.
    - Quotation, Commission, Payment modules (core).
    - Admin + User dashboard.

    ## [1.0.1] - YYYY-MM-DD

    ### Fixed
    - ...

    ## [1.1.0] - YYYY-MM-DD

    ### Added
    - ...

## 5. Update Rules
- Update changelog **setiap release**, sebelum merge ke main.
- Setiap item changelog: apa yang berubah + dampak.
- Untuk breaking change: sertakan migration instructions.
- Tidak perlu update changelog untuk setiap commit kecil (group ke release).