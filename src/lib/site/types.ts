// Shapes used by the public site build (Phase 3). Built from Supabase rows (or the local fixture).

export type LangCode = string; // 'en', 'fr', 'de', 'it', 'pt-BR', 'es', …
export type Currency = 'EUR' | 'USD';
export type FormatType = 'paperback' | 'hardcover' | 'ebook' | 'bundle';

export interface Lang {
  code: LangCode;       // hreflang code
  prefix: string;       // '' for English, 'pt' for pt-BR
  nameEn: string;
  native: string;
  sort: number;
}

export interface Media {
  id: string;
  bucket: string;
  path: string;
  url: string;          // absolute public URL
  width: number | null;
  height: number | null;
  alt: Record<LangCode, string>;
}

export interface Seo { seoTitle?: string | null; seoDescription?: string | null }

export interface AuthorTr extends Seo { slug: string; bio: string | null }
export interface Author { id: string; name: string; sortName: string; photo: Media | null; website: string | null; sort: number; tr: Record<LangCode, AuthorTr> }

export interface TaxonTr extends Seo { slug: string; name: string; intro: string | null }
export interface Category { id: string; sort: number; image: Media | null; tr: Record<LangCode, TaxonTr> }
export interface Collection { id: string; sort: number; cover: Media | null; tr: Record<LangCode, TaxonTr> }

export interface Money { EUR: number; USD: number } // cents

export interface Format {
  id: string;
  bookId: string | null;
  collectionId: string | null;
  type: FormatType;
  bundleOf: 'paperback' | 'hardcover' | 'ebook' | null;
  isbn: string | null;
  regular: Money;
  price: Money;                 // price charged at build time (sale applied)
  onSale: boolean;
  saleEndsAt: string | null;
  lowest30: Partial<Money>;     // EU "lowest price in the last 30 days" (only when on sale)
  availability: 'available' | 'preorder' | 'out_of_print';
  releaseDate: string | null;   // = publication date of this format
  pages: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightG: number | null;
  members: string[];            // bundle: member format ids in reading order
  preview: { url: string; width: number | null; height: number | null }[];
}

export interface BookTr extends Seo {
  slug: string; title: string; subtitle: string | null; description: string | null;
  headingH2: string | null; headingH3: string | null;
}
export interface Book {
  id: string;
  textLanguage: string;
  publisher: string;
  collectionId: string | null;
  position: number | null;
  cover: Media | null;
  gallery: Media[];
  retailerLinks: { label: string; url: string }[];
  featured: boolean;
  tags: string[];
  authors: string[];       // author ids (role author), ordered
  translators: string[];
  categoryIds: string[];
  relatedBookIds: string[];
  relatedArticleIds: string[];
  formats: Format[];
  updatedAt: string;
  tr: Record<LangCode, BookTr>;
}

export interface ArticleTr extends Seo { slug: string; title: string; excerpt: string | null; html: string; minutes: number | null }
export interface Article {
  id: string; authorId: string | null; cover: Media | null; publishedAt: string; updatedAt: string;
  categoryIds: string[]; bookIds: string[]; tr: Record<LangCode, ArticleTr>;
}

export interface ShelfList { key: string; mode: string; rule: Record<string, unknown>; max: number; items: string[]; names: Record<LangCode, string> }

export interface SiteData {
  source: 'supabase' | 'fixture';
  builtAt: string;
  languages: Lang[];                       // languages that get a public site (complete website text)
  enabledLanguages: Lang[];                // switched on in the dashboard
  textCompleteness: Record<LangCode, { done: number; total: number }>;
  text: Record<LangCode, Record<string, string>>;
  settings: Record<string, any>;
  authors: Author[];
  categories: Category[];
  collections: Collection[];
  books: Book[];
  setFormats: Format[];                    // complete-collection sets
  articles: Article[];
  lists: ShelfList[];
  instagram: { media: Media; url: string | null }[];
  shipping: { region: string; countries: string[]; carrier: string; service: string; tracked: boolean; price: Money; min: number; max: number }[];
}
