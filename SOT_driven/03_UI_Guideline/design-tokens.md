# Design Tokens

> **Status**: `Approved` | **Pemilik**: Frontend Lead + Designer | **Terakhir Update**: 2026-06-12

> **Token** = nilai design (warna, font, spacing) yang dipakai konsisten di seluruh aplikasi. Diambil dari `tailwind.config` inline di setiap HTML.

## 1. Color Palette

### Primary (Blue)
Diambil dari `cob.html`, `class.html`, dll.
| Token | Hex | Tailwind Class | Penggunaan |
|---|---|---|---|
| `primary-50` | `#eff6ff` | `bg-primary-50` | Background subtle |
| `primary-100` | `#dbeafe` | `bg-primary-100` | Hover background |
| `primary-200` | `#bfdbfe` | `bg-primary-200` | Border light |
| `primary-300` | `#93c5fd` | `bg-primary-300` | Disabled |
| `primary-400` | `#60a5fa` | `bg-primary-400` | Icon hover |
| `primary-500` | `#3b82f6` | `bg-primary-500` | Button default |
| `primary-600` | `#2563eb` | `bg-primary-600` | Button hover, link |
| `primary-700` | `#1d4ed8` | `bg-primary-700` | Active state |
| `primary-800` | `#1e40af` | `bg-primary-800` | Sidebar dark |
| `primary-900` | `#1e3a8a` | `bg-primary-900` | Header dark |

### Neutral (Gray)
Pakai Tailwind default `gray-*` (50-900).

### Status Colors (dari `custom.css`)
| Token | Hex | Class | Penggunaan |
|---|---|---|---|
| `success-bg` | `#d1fae5` | `status-active` | Aktif / Sukses |
| `success-text` | `#065f46` | `status-active` | |
| `warning-bg` | `#fef3c7` | `status-pending` | Pending |
| `warning-text` | `#92400e` | `status-pending` | |
| `danger-bg` | `#fee2e2` | `status-expired` | Expired / Error |
| `danger-text` | `#991b1b` | `status-expired` | |
| `error-border` | `#ef4444` | `input-error` | Validation error |
| `success-border` | `#10b981` | `input-success` | Validation success |

## 2. Typography
| Token | Value | Tailwind | Penggunaan |
|---|---|---|---|
| `font-sans` | system-ui, sans-serif | default | Body |
| `text-xs` | 0.75rem (12px) | `text-xs` | Caption, badge |
| `text-sm` | 0.875rem (14px) | `text-sm` | Body small, table |
| `text-base` | 1rem (16px) | `text-base` | Body default |
| `text-lg` | 1.125rem (18px) | `text-lg` | Heading 4 |
| `text-xl` | 1.25rem (20px) | `text-xl` | Heading 3 |
| `text-2xl` | 1.5rem (24px) | `text-2xl` | Heading 2 |
| `text-3xl` | 1.875rem (30px) | `text-3xl` | Heading 1 |
| `font-normal` | 400 | `font-normal` | Body |
| `font-semibold` | 600 | `font-semibold` | Sub-heading |
| `font-bold` | 700 | `font-bold` | Heading |

## 3. Spacing
Pakai Tailwind default (4px base).
| Token | Value | Class | Penggunaan |
|---|---|---|---|
| `space-1` | 0.25rem (4px) | `p-1`, `m-1` | |
| `space-2` | 0.5rem (8px) | `p-2`, `m-2` | Tight |
| `space-3` | 0.75rem (12px) | `p-3` | Form padding |
| `space-4` | 1rem (16px) | `p-4` | Card padding |
| `space-6` | 1.5rem (24px) | `p-6` | Section |
| `space-8` | 2rem (32px) | `p-8` | Page |
| `space-12` | 3rem (48px) | `p-12` | Hero |

## 4. Border Radius
| Token | Value | Class | Penggunaan |
|---|---|---|---|
| `rounded` | 0.25rem (4px) | `rounded` | |
| `rounded-md` | 0.375rem (6px) | `rounded-md` | |
| `rounded-lg` | 0.5rem (8px) | `rounded-lg` (card, button) |
| `rounded-full` | 9999px | `rounded-full` (badge, avatar) |

## 5. Shadow
| Token | Value | Class | Penggunaan |
|---|---|---|---|
| `shadow-sm` | 0 1px 2px rgba(0,0,0,.05) | `shadow-sm` | Border emphasis |
| `shadow` | 0 1px 3px rgba(0,0,0,.1) | `shadow` | Card default |
| `shadow-md` | 0 4px 6px rgba(0,0,0,.1) | `shadow-md` | Dropdown |
| `shadow-lg` | 0 10px 25px rgba(0,0,0,.1) | `shadow-lg` | Modal |

## 6. Z-Index
| Token | Value | Class | Penggunaan |
|---|---|---|---|
| `z-base` | 0 | `z-0` | Content |
| `z-sticky` | 10 | `z-10` | Sticky header |
| `z-dropdown` | 20 | `z-20` | Dropdown menu |
| `z-modal` | 50 | `z-50` | Modal dialog |
| `z-toast` | 100 | `z-[100]` | Toast notification |

## 7. Breakpoint (Responsive)
| Name | Min Width | Catatan |
|---|---|---|
| `sm` | 640px | Tablet portrait |
| `md` | 768px | Tablet landscape |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

## 8. Iconography
- **Library**: Font Awesome 6.4.0 via CDN.
- **Size**:
  - Inline: `fa-sm` (14px) atau default (16px).
  - Button: `fa-lg` (20px).
  - Header: `fa-2x` (32px).

## 9. Animation
| Token | Value | Class | Penggunaan |
|---|---|---|---|
| `transition-fast` | 150ms ease | `transition-all duration-150` | Hover |
| `transition-base` | 200ms ease | `transition-all duration-200` | Default |
| `transition-slow` | 300ms ease | `transition-all duration-300` | Modal |

## 10. Tailwind Config (Standard)
Setiap file HTML harus menyertakan:
```html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: { /* lihat bagian 1 */ }
        }
      }
    }
  };
</script>
```

> **Aturan**: Tidak boleh hard-code hex color di HTML/CSS. Selalu rujuk ke token.
