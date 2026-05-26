# Design Tokens Reference Guide

## 🎨 Overview

Design tokens are the foundational design decisions of the Magazine Manager Kiro application, stored as CSS custom properties to ensure consistency across all components and features.

## 📁 Token Organization

### **Token Structure**
```
src/shared/design-system/tokens/
├── colors.css                     # Color palette and semantic colors
├── spacing.css                    # Spacing scale and layout tokens
├── typography.css                 # Font scales, weights, and text styles
├── animations.css                 # Transitions and motion
└── index.css                      # Combined token imports
```

### **Additional Token Files**
```
src/shared/styles/
└── design-tokens.css              # Component-specific tokens (tooltips, buttons)
```

## 🎨 Color Tokens

### **Brand Colors (Ocean Theme)**
```css
/* Primary Brand Colors */
--color-ocean-50: rgb(240, 249, 255);   /* Lightest ocean - Backgrounds */
--color-ocean-100: rgb(224, 242, 254);  /* Very light ocean - Hover states */
--color-ocean-200: rgb(186, 230, 253);  /* Light ocean - Borders */
--color-ocean-300: rgb(125, 211, 252);  /* Medium light ocean - Disabled states */
--color-ocean-400: rgb(56, 189, 248);   /* Medium ocean - Hover accents */
--color-ocean-500: rgb(14, 165, 233);   /* Base ocean - Interactive elements */
--color-ocean-600: rgb(2, 132, 199);    /* FLUORESCENT OCEAN - Metric values, data viz */
--color-ocean-700: rgb(3, 105, 161);    /* Dark ocean - Active states */
--color-ocean-800: rgb(7, 89, 133);     /* Primary brand - Headings, emphasis */
--color-ocean-900: rgb(12, 74, 110);    /* Darkest ocean - High contrast text */
```

**600-Shade (Fluorescent but Readable):**
The 600-shade is specifically designed to be **bright and eye-catching** (fluorescent quality) while maintaining **excellent readability** on white backgrounds. This shade is ideal for metric values, data visualizations, and important numbers that need to stand out.

### **Semantic Colors**
```css
/* Success Colors */
--color-success-50: rgb(240, 253, 244);   /* Light backgrounds */
--color-success-100: rgb(220, 252, 231);  /* Hover backgrounds */
--color-success-500: rgb(34, 197, 94);    /* Buttons, badges */
--color-success-600: rgb(22, 163, 74);    /* FLUORESCENT GREEN - Metric values, positive data */
--color-success-800: rgb(22, 101, 52);    /* Dark text, emphasis */

/* Warning Colors */
--color-warning-50: rgb(255, 251, 235);   /* Light backgrounds */
--color-warning-100: rgb(254, 243, 199);  /* Hover backgrounds */
--color-warning-500: rgb(245, 158, 11);   /* Buttons, badges */
--color-warning-600: rgb(217, 119, 6);    /* FLUORESCENT AMBER - Metric values, caution data */
--color-warning-800: rgb(146, 64, 14);    /* Dark text, emphasis */

/* Error Colors */
--color-error-50: rgb(254, 242, 242);     /* Light backgrounds */
--color-error-100: rgb(254, 226, 226);    /* Hover backgrounds */
--color-error-500: rgb(239, 68, 68);      /* Buttons, badges */
--color-error-600: rgb(220, 38, 38);      /* FLUORESCENT RED - Metric values, error data */
--color-error-800: rgb(153, 27, 27);      /* Dark text, emphasis */

/* Neutral Colors */
--color-gray-50: rgb(249, 250, 251);      /* Subtle backgrounds */
--color-gray-100: rgb(243, 244, 246);     /* Light backgrounds */
--color-gray-200: rgb(229, 231, 235);     /* Borders, dividers */
--color-gray-300: rgb(209, 213, 219);     /* Disabled borders */
--color-gray-400: rgb(156, 163, 175);     /* Placeholder text */
--color-gray-500: rgb(107, 114, 128);     /* Muted text */
--color-gray-600: rgb(75, 85, 99);        /* Secondary text, subtitles */
--color-gray-700: rgb(55, 65, 81);        /* Body text */
--color-gray-800: rgb(31, 41, 55);        /* Emphasis text */
--color-gray-900: rgb(17, 24, 39);        /* Primary text, titles (black) */
```

**⚡ 600-Shade Colors - Fluorescent & Readable:**
All 600-shade colors across the palette are designed with a **fluorescent quality** - they are bright, vibrant, and visually striking while maintaining **excellent readability** on white backgrounds. These shades are perfect for:
- Metric card values
- Data visualization
- Important numbers and statistics
- Dashboard KPIs
- Chart elements

### **Semantic Token Usage**
```css
/* Component-Specific Semantic Colors */
--label-color: var(--color-ocean-600);           /* ALL form labels */
--text-primary: var(--color-gray-900);           /* Primary text, titles (black/dark gray) */
--text-secondary: var(--color-gray-600);         /* Secondary text, subtitles */
--text-muted: var(--color-gray-400);             /* Muted text, placeholders */
--border-default: var(--color-gray-200);         /* Default borders */
--bg-surface: var(--color-white);                /* Surface backgrounds */
--bg-subtle: var(--color-gray-50);               /* Subtle backgrounds */

/* Metric Card & Data Visualization Colors */
--metric-value-ocean: var(--color-ocean-600);    /* Fluorescent ocean blue */
--metric-value-success: var(--color-success-600); /* Fluorescent green */
--metric-value-warning: var(--color-warning-600); /* Fluorescent amber */
--metric-value-error: var(--color-error-600);    /* Fluorescent red */
--metric-title: var(--color-gray-900);           /* Black/dark gray for readability */
--metric-subtitle: var(--color-gray-600);        /* Medium gray for subtitles */
```

## 📏 Spacing Tokens

### **Base Spacing Scale**
```css
/* Spacing Scale (rem-based) */
--space-0: 0;                    /* 0px */
--space-px: 0.0625rem;           /* 1px */
--space-0-5: 0.125rem;           /* 2px */
--space-1: 0.25rem;              /* 4px */
--space-1-5: 0.375rem;           /* 6px */
--space-2: 0.5rem;               /* 8px */
--space-2-5: 0.625rem;           /* 10px */
--space-3: 0.75rem;              /* 12px */
--space-3-5: 0.875rem;           /* 14px */
--space-4: 1rem;                 /* 16px - Base unit */
--space-5: 1.25rem;              /* 20px */
--space-6: 1.5rem;               /* 24px */
--space-7: 1.75rem;              /* 28px */
--space-8: 2rem;                 /* 32px */
--space-9: 2.25rem;              /* 36px */
--space-10: 2.5rem;              /* 40px */
--space-11: 2.75rem;             /* 44px */
--space-12: 3rem;                /* 48px */
--space-14: 3.5rem;              /* 56px */
--space-16: 4rem;                /* 64px */
--space-20: 5rem;                /* 80px */
--space-24: 6rem;                /* 96px */
--space-28: 7rem;                /* 112px */
--space-32: 8rem;                /* 128px */
```

### **Component Spacing**
```css
/* Form Field Spacing */
--form-field-gap-x: var(--space-3);             /* 12px horizontal */
--form-field-gap-y: var(--space-4);             /* 16px vertical */
--form-section-gap: var(--space-6);             /* 24px between sections */

/* Layout Spacing */
--layout-padding: var(--space-6);               /* 24px - Standard padding */
--layout-margin: var(--space-4);                /* 16px - Standard margin */
--layout-gap: var(--space-4);                   /* 16px - Standard gap */

/* Component Spacing */
--component-padding-sm: var(--space-2);         /* 8px - Small padding */
--component-padding-md: var(--space-4);         /* 16px - Medium padding */
--component-padding-lg: var(--space-6);         /* 24px - Large padding */
```

## 📝 Typography Tokens

### **Font Families**
```css
/* Font Stacks */
--font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
--font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
```

### **Font Sizes**
```css
/* Font Size Scale */
--text-xs: 0.75rem;              /* 12px */
--text-sm: 0.875rem;             /* 14px - Standard UI text */
--text-base: 1rem;               /* 16px - Base text */
--text-lg: 1.125rem;             /* 18px - Large text */
--text-xl: 1.25rem;              /* 20px - Extra large */
--text-2xl: 1.5rem;              /* 24px - Heading */
--text-3xl: 1.875rem;            /* 30px - Large heading */
--text-4xl: 2.25rem;             /* 36px - Extra large heading */
```

### **Font Weights**
```css
/* Font Weights */
--font-thin: 100;
--font-extralight: 200;
--font-light: 300;
--font-normal: 400;              /* Default text weight */
--font-medium: 500;              /* Medium emphasis */
--font-semibold: 600;            /* Strong emphasis */
--font-bold: 700;                /* Bold text */
--font-extrabold: 800;
--font-black: 900;
```

### **Line Heights**
```css
/* Line Heights */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;           /* Default line height */
--leading-relaxed: 1.625;
--leading-loose: 2;
```

### **Semantic Typography**
```css
/* UI Text Tokens */
--text-ui-xs: var(--text-xs);                   /* 12px - Helper text */
--text-ui-sm: var(--text-sm);                   /* 14px - Standard UI */
--text-ui-base: var(--text-base);               /* 16px - Emphasis text */
--text-ui-lg: var(--text-lg);                   /* 18px - Section headers */

/* Heading Tokens */
--text-heading-sm: var(--text-lg);              /* 18px - Small headings */
--text-heading-md: var(--text-xl);              /* 20px - Medium headings */
--text-heading-lg: var(--text-2xl);             /* 24px - Large headings */
--text-heading-xl: var(--text-3xl);             /* 30px - Extra large headings */
```

## 🎭 Animation Tokens

### **Duration Tokens**
```css
/* Animation Durations */
--duration-instant: 0ms;
--duration-fast: 100ms;          /* Quick interactions */
--duration-normal: 150ms;        /* Standard transitions */
--duration-slow: 200ms;          /* Deliberate animations */
--duration-slower: 300ms;        /* Emphasis animations */
--duration-slowest: 500ms;       /* Major state changes */
```

### **Easing Tokens**
```css
/* Easing Functions */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);        /* Default easing */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### **Component Animation Tokens**
```css
/* Tooltip Animations */
--tooltip-animation-duration: var(--duration-normal);
--tooltip-animation-timing: var(--ease-out);
--tooltip-delay-default: 300ms;

/* Button Animations */
--button-transition: all var(--duration-normal) var(--ease-out);
--button-scale-hover: 1.05;

/* Modal Animations */
--modal-animation-duration: var(--duration-slow);
--modal-backdrop-animation: var(--duration-normal);
```

## 🧩 Component-Specific Tokens

### **Form Field Tokens**
```css
/* Form Field Heights */
--form-field-height-regular: 40px;              /* Regular forms */
--form-field-height-modal: 36px;                /* Modal forms */
--form-field-height-compact: 32px;              /* Compact forms */

/* Form Field Colors */
--form-field-border: var(--color-gray-300);
--form-field-border-focus: var(--color-ocean-500);
--form-field-border-error: var(--color-error-500);
--form-field-bg: var(--color-white);
--form-field-text: var(--color-gray-900);
```

### **Metric Card Tokens**
```css
/* Metric Card Dimensions */
--metric-card-min-height: 140px;                /* Consistent card height */
--metric-value-min-height: 36px;                /* Value container height for alignment */

/* Metric Card Typography */
--metric-title-size: var(--text-sm);            /* 14px - Card title */
--metric-title-weight: var(--font-medium);      /* 500 */
--metric-title-color: var(--color-gray-900);    /* Black/dark gray */
--metric-value-size: var(--text-2xl);           /* 24px - Value size */
--metric-value-weight: var(--font-bold);        /* 700 */
--metric-subtitle-size: var(--text-xs);         /* 12px - Subtitle */
--metric-subtitle-weight: var(--font-normal);   /* 400 */
--metric-subtitle-color: var(--color-gray-600); /* Medium gray */

/* Metric Card Spacing */
--metric-card-padding: var(--space-4);          /* 16px - Internal padding */
--metric-card-gap: var(--space-3);              /* 12px - Between cards */
--metric-grid-margin-bottom: var(--space-6);    /* 24px - Below grid */
--metric-title-margin-bottom: var(--space-3);   /* 12px - Below title */
--metric-value-margin-bottom: var(--space-2);   /* 8px - Below value */

/* Metric Card Grid */
--metric-grid-columns-min: 3;                   /* Minimum cards per row */
--metric-grid-columns-max: 8;                   /* Maximum cards per row */
```

### **Table Tokens**
```css
/* Table Dimensions */
--table-row-height: 48px;                       /* Standard row height */
--table-header-height: 44px;                    /* Header row height */

/* Action Button Tokens */
--action-button-size: 36px;                     /* h-9 w-9 standard */
--action-button-padding: 0;                     /* p-0 */
--action-button-icon-size: 16px;                /* h-4 w-4 icons */
--action-button-transition: all 200ms ease-in-out;

/* Table Typography */
--table-primary-text-size: var(--text-sm);      /* 14px */
--table-primary-text-weight: var(--font-semibold); /* 600 */
--table-primary-text-color: var(--color-ocean-800);
--table-secondary-text-size: var(--text-xs);    /* 12px */
--table-secondary-text-color: var(--color-gray-600);
```

### **Tooltip Tokens**
```css
/* Tooltip Colors - Default (Soft Gray) */
--tooltip-bg-default: var(--color-gray-700);
--tooltip-text-default: var(--color-white);
--tooltip-border-default: var(--color-gray-600);
--tooltip-shadow-default: rgba(0, 0, 0, 0.15);

/* Tooltip Colors - Ocean Theme */
--tooltip-bg-ocean: var(--color-ocean-800);
--tooltip-text-ocean: var(--color-white);
--tooltip-border-ocean: var(--color-ocean-600);
--tooltip-shadow-ocean: rgba(12, 74, 110, 0.2);

/* Tooltip Spacing */
--tooltip-padding-x: var(--space-3);            /* 12px */
--tooltip-padding-y: var(--space-2);            /* 8px */
--tooltip-border-radius: var(--space-2);        /* 8px */
--tooltip-max-width: 250px;
```

## 🎯 Usage Guidelines

### **Token Usage Principles**
1. **Always use tokens**: Never use hardcoded values
2. **Semantic naming**: Use meaningful token names
3. **Consistent application**: Apply tokens consistently across components
4. **Fallback values**: Provide fallbacks for older browsers

### **Color Usage by Context**

#### **Metric Cards & Data Visualization**
```css
/* Metric Card Grid Layout - REQUIRED PROPERTIES */
.metric-card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);      /* 3-8 cards allowed */
  gap: var(--metric-card-gap);                /* var(--space-3) = 12px */
  justify-items: stretch;                     /* Cards fill columns evenly */
  align-items: stretch;                       /* Cards stretch to same height */
  margin-bottom: var(--metric-grid-margin-bottom);  /* var(--space-6) = 24px */
  overflow-x: auto;                           /* Horizontal scroll on narrow viewports */
  overflow-y: hidden;                         /* No vertical scroll */
  padding: 2px;                               /* Prevent focus ring clipping */
  -webkit-overflow-scrolling: touch;          /* Smooth mobile scroll */
}

/* ❌ FORBIDDEN Grid Properties */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));  /* Creates uneven widths */
grid-template-columns: repeat(8, minmax(160px, 1fr));         /* minmax() creates uneven widths */
justify-items: center;                                        /* Creates inconsistent card widths */

/* Metric Card Values - Use 600-shade FLUORESCENT colors */
.metric-value {
  color: var(--color-ocean-600);          /* Fluorescent blue */
  color: var(--color-success-600);        /* Fluorescent green */
  color: var(--color-purple-600);         /* Fluorescent purple */
  font-size: var(--metric-value-size);    /* var(--text-2xl) = 24px */
  font-weight: var(--metric-value-weight); /* var(--font-bold) = 700 */
  line-height: var(--leading-none);       /* 1 - Precise alignment */
  min-height: var(--metric-value-min-height);  /* 36px - Alignment height */
  display: flex;
  align-items: center;
  justify-content: center;
  /* NEVER use black or gray for metric values */
}

/* Metric Card Titles - Use dark gray/black for readability */
.metric-title {
  color: var(--metric-title-color);       /* var(--color-gray-900) - Black/dark gray */
  font-size: var(--metric-title-size);    /* var(--text-sm) = 14px */
  font-weight: var(--metric-title-weight); /* var(--font-medium) = 500 */
  text-align: center;
  margin-bottom: var(--metric-title-margin-bottom);  /* var(--space-3) = 12px */
}

/* Metric Card Subtitles - Use medium gray */
.metric-subtitle {
  color: var(--metric-subtitle-color);      /* var(--color-gray-600) - Medium gray */
  font-size: var(--metric-subtitle-size);   /* var(--text-xs) = 12px */
  font-weight: var(--metric-subtitle-weight); /* var(--font-normal) = 400 */
  text-align: center;
}

/* Metric Card Container */
.metric-card {
  padding: var(--metric-card-padding);    /* var(--space-4) = 16px */
  background-color: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--space-2);          /* 8px */
  min-height: var(--metric-card-min-height);  /* 140px */
  display: flex;
  flex-direction: column;
}

/* ❌ WRONG - Do not use for metric values */
color: var(--color-gray-900);         /* Too dark, not fluorescent */
color: var(--color-ocean-300);        /* Too light, not readable */
color: var(--color-ocean-800);        /* Too dark, not fluorescent */
```

#### **Form Labels**
```css
/* ALL form labels MUST use ocean-600 */
.form-label {
  color: var(--label-color);          /* var(--color-ocean-600) */
}
```

#### **Body Text & Content**
```css
/* Primary text - Black/dark gray for maximum readability */
.text-primary {
  color: var(--text-primary);         /* var(--color-gray-900) */
}

/* Secondary text - Medium gray */
.text-secondary {
  color: var(--text-secondary);       /* var(--color-gray-600) */
}
```

### **CSS Implementation**
```css
/* ✅ Good - Using design tokens */
.component {
  color: var(--text-primary);
  font-size: var(--text-ui-base);
  padding: var(--space-4);
  border-radius: var(--space-2);
  transition: all var(--duration-normal) var(--ease-out);
}

/* ❌ Bad - Hardcoded values */
.component {
  color: #1f2937;
  font-size: 16px;
  padding: 16px;
  border-radius: 8px;
  transition: all 150ms ease-out;
}
```

### **JavaScript/TypeScript Usage**
```tsx
// ✅ Good - Using CSS custom properties
const styles = {
  color: 'var(--text-primary)',
  fontSize: 'var(--text-ui-base)',
  padding: 'var(--space-4)'
}

// ✅ Good - Tailwind classes (which use tokens internally)
<div className="text-sm text-gray-900 p-4 rounded-lg">

// ✅ Good - Metric Card Grid with design tokens
<div 
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 'var(--metric-card-gap)',
    justifyItems: 'stretch',
    alignItems: 'stretch',
    marginBottom: 'var(--metric-grid-margin-bottom)',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '2px',
    WebkitOverflowScrolling: 'touch'
  }}
>
  <MetricCard {...props} />
</div>
```

## 🔄 Token Maintenance

### **Adding New Tokens**
1. **Define in appropriate token file** (`colors.css`, `spacing.css`, etc.)
2. **Use semantic naming** that describes purpose, not appearance
3. **Document usage** in this reference guide
4. **Update components** to use new tokens
5. **Test across browsers** for compatibility

### **Updating Existing Tokens**
1. **Consider impact** on existing components
2. **Test thoroughly** across the application
3. **Update documentation** to reflect changes
4. **Communicate changes** to the development team

### **Token Naming Conventions**
- **Colors**: `--color-[palette]-[shade]` (e.g., `--color-ocean-600`)
- **Spacing**: `--space-[size]` (e.g., `--space-4`)
- **Typography**: `--text-[size]` or `--font-[property]` (e.g., `--text-sm`, `--font-medium`)
- **Component**: `--[component]-[property]` (e.g., `--tooltip-bg-default`)

### **Extended Color Palette (Additional 600-Shades)**
```css
/* Additional Fluorescent Colors for Data Visualization */
--color-purple-600: rgb(147, 51, 234);   /* Fluorescent purple */
--color-indigo-600: rgb(79, 70, 229);    /* Fluorescent indigo */
--color-blue-600: rgb(37, 99, 235);      /* Fluorescent blue */
--color-green-600: rgb(22, 163, 74);     /* Fluorescent green */
--color-orange-600: rgb(234, 88, 12);    /* Fluorescent orange */
--color-teal-600: rgb(13, 148, 136);     /* Fluorescent teal */
--color-pink-600: rgb(219, 39, 119);     /* Fluorescent pink */
--color-yellow-600: rgb(202, 138, 4);    /* Fluorescent yellow */
```

**All 600-shade colors follow the same principle:**
- ✅ **Bright/fluorescent** for visual impact
- ✅ **Readable** on white backgrounds
- ✅ **Consistent contrast ratio** for accessibility
- ✅ **Perfect for metric values** and data visualization

## 📊 Metric Card Design Tokens Summary

### **Complete Token Set for Metric Cards**
```css
/* Dimensions */
--metric-card-min-height: 140px;
--metric-value-min-height: 36px;

/* Typography Sizes */
--metric-title-size: var(--text-sm);         /* 14px */
--metric-value-size: var(--text-2xl);        /* 24px */
--metric-subtitle-size: var(--text-xs);      /* 12px */

/* Typography Weights */
--metric-title-weight: var(--font-medium);   /* 500 */
--metric-value-weight: var(--font-bold);     /* 700 */
--metric-subtitle-weight: var(--font-normal); /* 400 */

/* Colors */
--metric-title-color: var(--color-gray-900);    /* Black/dark gray */
--metric-subtitle-color: var(--color-gray-600); /* Medium gray */
/* Value colors: Use 600-shade semantic colors (ocean, success, purple, etc.) */

/* Spacing */
--metric-card-padding: var(--space-4);           /* 16px */
--metric-card-gap: var(--space-3);               /* 12px */
--metric-grid-margin-bottom: var(--space-6);     /* 24px */
--metric-title-margin-bottom: var(--space-3);    /* 12px */
--metric-value-margin-bottom: var(--space-2);    /* 8px */

/* Grid Constraints */
--metric-grid-columns-min: 3;   /* Minimum cards per row */
--metric-grid-columns-max: 8;   /* Maximum cards per row */
```

### **Usage Example**
```tsx
// Complete metric card grid implementation with all tokens
<div 
  role="region"
  aria-label="Metrics dashboard"
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 'var(--metric-card-gap)',
    justifyItems: 'stretch',
    alignItems: 'stretch',
    marginBottom: 'var(--metric-grid-margin-bottom)',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '2px',
    WebkitOverflowScrolling: 'touch'
  }}
>
  <MetricCard
    title="Revenue"
    value={125000}
    format="currency"
    trend={15.3}
    subtitle="this month"
    color="green"
    tooltipDescription="Total revenue"
  />
</div>
```

**Reference:** See `METRIC_CARDS_DESIGN_STANDARD.md` for complete implementation guidelines.

---

**These design tokens ensure visual consistency, maintainable code, and a cohesive user experience across the entire Magazine Manager Kiro application.**

**Last Updated:** November 3, 2025  
**Version:** 2.0 - Added comprehensive metric card tokens and grid layout specifications