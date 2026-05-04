export const MAX_FILE_SIZE_MB = 25;

export const TOOL_CONFIG = {
  "jpg-to-pdf": {
    title: "JPG to PDF",
    h1: "Convert JPG to PDF Online Free",
    desc: "Convert JPG images to PDF online in just a few clicks. Upload one or multiple images, arrange them in your preferred order, and download a single PDF fast. The tool is free to use and files are processed securely without storage after processing.",
    features: [
      { icon: "🖼️", title: "Batch Upload", text: "Convert multiple JPG files in one run." },
      { icon: "📄", title: "Page Size Control", text: "Choose A4 or keep original image dimensions." },
      { icon: "🧭", title: "Orientation", text: "Export in portrait or landscape format." }
    ],
    related: ["compress-pdf", "image-compress"]
  },
  "merge-pdf": {
    title: "PDF Merge",
    h1: "Merge PDF Files Into One Free",
    desc: "Use this tool to merge PDF files into one free document in your browser. Upload multiple PDFs, set the order you want, and combine them into a single file quickly. It is free, runs fast, and your files are processed securely—they are not stored and are removed after you finish.",
    features: [
      { icon: "📚", title: "Multi-PDF Merge", text: "Combine several documents into a single file." },
      { icon: "🔀", title: "Custom Order", text: "Control merge order using sequence input." },
      { icon: "📊", title: "Page Overview", text: "Check total pages before downloading." }
    ],
    related: ["split-pdf", "compress-pdf"]
  },
  "compress-pdf": {
    title: "PDF Compress",
    h1: "Reduce PDF File Size Online Free",
    desc: "Shrink your PDF in the browser: upload a file, choose low, medium, or high compression, and download a smaller document quickly. It is free, runs online, and your files are handled securely—they are not stored after processing.",
    features: [
      { icon: "🎚️", title: "Compression Levels", text: "Choose low, medium, or high compression." },
      { icon: "📉", title: "Size Comparison", text: "See original and compressed file sizes." },
      { icon: "⚡", title: "Instant Export", text: "Download the optimized PDF immediately." }
    ],
    related: ["merge-pdf", "jpg-to-pdf"],
    example: "Upload a report PDF, choose Medium, and download a lighter version."
  },
  "split-pdf": {
    title: "PDF Split",
    h1: "Split PDF Pages Online Free",
    desc: "Split PDF pages online into individual files or extract specific pages and ranges in seconds. Upload your document, choose the pages you need, and download the result fast for free. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "🧩", title: "All Pages Split", text: "Create one file per page automatically." },
      { icon: "📐", title: "Range Split", text: "Extract custom page groups such as 1-3,4-6." },
      { icon: "🎯", title: "Single Page", text: "Pull out exactly one page when needed." }
    ],
    related: ["merge-pdf", "pdf-to-word"]
  },
  "pdf-to-word": {
    title: "PDF to Word",
    h1: "Convert PDF to Word Online Free",
    desc: "Turn PDFs into a Microsoft Word–ready .doc where every page keeps its on-screen layout as a high-quality image. It is fast, free, and runs securely in your browser with no file storage after you download.",
    features: [
      { icon: "📄", title: "Page-accurate", text: "Each PDF page is placed on its own Word page at the correct size." },
      { icon: "🖼️", title: "Images preserved", text: "Photos and graphics stay visible because each page is rendered as a picture." },
      { icon: "🌐", title: "In-browser", text: "Runs locally in your browser—no upload to a server." }
    ],
    related: ["split-pdf", "word-counter"],
    example: "Upload a PDF and download a .doc file, then open it in Microsoft Word."
  },
  "image-compress": {
    title: "Image Compress",
    h1: "Reduce Image Size Online Free",
    desc: "Reduce image file size online to make uploads and sharing easier. Compress JPG, PNG, and WebP images quickly with a free workflow and instant results. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "🖼️", title: "Multi-format Input", text: "Supports JPEG/JPG, PNG, WEBP, HEIC/HEIF, and SVG uploads." },
      { icon: "🎛️", title: "Quality & Resolution", text: "One slider instantly adjusts output resolution and visual quality." },
      { icon: "📉", title: "Size Preview", text: "See original vs estimated size before you download." }
    ],
    related: ["compress-pdf", "image-resize", "image-converter"]
  },
  "image-resize": {
    title: "Image Resize",
    h1: "Resize Image Online Free",
    desc: "Resize image online free by setting specific width and height values for your needs. Adjust dimensions for web, social media, and uploads in a fast workflow. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "📏", title: "Width & Height", text: "Resize by exact pixel dimensions." },
      { icon: "📊", title: "Percentage Mode", text: "Scale image by percentage in one step." },
      { icon: "🔒", title: "Aspect Lock", text: "Maintain original ratio while resizing." }
    ],
    related: ["image-compress", "image-converter"]
  },
  "qr-code-generator": {
    title: "QR Code Generator",
    h1: "QR Code Generator Online Free",
    desc: "Generate QR codes for URLs, plain text, and more in seconds. Create your code instantly with a free, fast workflow. Your input is processed securely and no data is stored.",
    features: [
      { icon: "🔗", title: "Text or URL", text: "Generate QR from links or custom text." },
      { icon: "🎨", title: "Style Options", text: "Adjust size and foreground/background colors." },
      { icon: "📤", title: "PNG/SVG Export", text: "Download QR in raster or vector format." }
    ],
    related: ["password-generator", "word-counter"],
    example: "Paste your website URL, adjust colors/size, preview, then download PNG."
  },
  "password-generator": {
    title: "Password Generator",
    h1: "Strong Password Generator Online Free",
    desc: "Generate strong, secure passwords you can trust for new accounts and logins. Adjust length and character sets to fit any requirement. It is fast, free to use, and runs in your browser with no storage of your secrets.",
    features: [
      { icon: "🔢", title: "Length Control", text: "Set password length from 4 to 32." },
      { icon: "⚙️", title: "Character Options", text: "Toggle lowercase, uppercase, numbers, symbols." },
      { icon: "📋", title: "Quick Copy", text: "Copy generated password instantly." }
    ],
    related: ["qr-code-generator", "word-counter"]
  },
  "word-counter": {
    title: "Word / Character Counter",
    h1: "Word, Character & Paragraph Counter Online Free",
    desc: "Count words, characters, and paragraphs in one place while you shape your draft. See how your text is structured at a glance, with fast, free updates that help writing, SEO checks, and everyday content work.",
    features: [
      { icon: "🔤", title: "Word Count", text: "Track total words as you type or paste." },
      { icon: "🔡", title: "Character Metrics", text: "Count with and without spaces." },
      { icon: "📄", title: "Paragraph counting", text: "Detect paragraphs from line breaks for structure checks." }
    ],
    related: ["password-generator", "pdf-to-word"]
  },
  "image-converter": {
    title: "Image Converter",
    h1: "Image Converter Online Free",
    desc: "Switch between JPG, PNG, WebP, and SVG in your workflow—upload a raster file, pick your target format, and download. The tool is fast, free, and runs in the browser with secure handling and no file storage after processing.",
    features: [
      { icon: "🔁", title: "JPG, PNG, WebP", text: "Upload and convert the three main web raster types both ways." },
      { icon: "📐", title: "SVG export", text: "Create vector SVG output from your image when you need scalable graphics." },
      { icon: "⚡", title: "Quick convert", text: "Choose formats, convert once, and download immediately." }
    ],
    related: ["image-compress", "image-resize", "svg-to-3d"]
  },
  "svg-to-3d": {
    title: "SVG to 3D",
    h1: "SVG to 3D Online Free",
    desc: "Upload an SVG and explore an extruded 3D preview in your browser. Tune depth, smoothness, colors, and material presets with WebGL—free to use and files are not stored after processing.",
    features: [
      { icon: "📐", title: "Path extrusion", text: "Filled paths and strokes become 3D geometry you can orbit and zoom." },
      { icon: "🎨", title: "Material presets", text: "Switch between plastic, metal, glass-style, gold, and more for quick looks." },
      { icon: "🖥️", title: "Runs locally", text: "Three.js renders in your browser; nothing is uploaded for conversion." }
    ],
    related: ["image-converter", "image-compress", "image-resize"]
  },
  "pdf-rotate": {
    title: "PDF Rotate",
    h1: "Rotate PDF Pages Online Free",
    desc: "Rotate PDF pages online to fix incorrect page orientation in seconds. Upload your file, choose 90, 180, or 270 degrees, and download the updated PDF fast for free. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "🔄", title: "Page Rotation", text: "Rotate full document in one click." },
      { icon: "📐", title: "Angle Options", text: "Use 90, 180, or 270 degree presets." },
      { icon: "📥", title: "Instant Download", text: "Save rotated PDF instantly." }
    ],
    related: ["pdf-delete-pages", "merge-pdf"]
  },
  "pdf-delete-pages": {
    title: "PDF Page Delete",
    h1: "Delete Pages from PDF Online Free",
    desc: "Delete pages from PDF online by removing unwanted pages in seconds. Upload your file, select the exact pages you want to remove, and download the updated PDF fast for free. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "🗑️", title: "Delete by Number", text: "Remove pages with comma-separated input." },
      { icon: "⚡", title: "Quick Edit", text: "Clean up PDFs before sharing." },
      { icon: "📥", title: "Download Result", text: "Export edited file instantly." }
    ],
    related: ["split-pdf", "pdf-rotate"]
  },
  "pdf-watermark": {
    title: "PDF Watermark",
    h1: "Add Watermark to PDF Online Free",
    desc: "Add watermark to PDF files online by inserting custom text across your document pages. Protect your files with a visible watermark in a fast and free workflow. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "💧", title: "Text Watermark", text: "Add brand or ownership text." },
      { icon: "🛡️", title: "Document Protection", text: "Discourage unauthorized reuse." },
      { icon: "📥", title: "Fast Export", text: "Download watermarked PDF immediately." }
    ],
    related: ["pdf-rotate", "compress-pdf"]
  },
  "pdf-to-jpg": {
    title: "PDF to JPG",
    h1: "Convert PDF to JPG Online Free",
    desc: "Convert PDF pages into JPG images online in a few clicks. Extract each page as a high-quality image, then download results quickly for free. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "📄", title: "Page to Image", text: "Each page becomes an image file." },
      { icon: "🖼️", title: "JPG Output", text: "Optimized for sharing and previews." },
      { icon: "⚡", title: "Quick Processing", text: "Works directly in browser." }
    ],
    related: ["jpg-to-pdf", "image-converter", "compress-pdf"]
  },
  "word-to-pdf": {
    title: "Word to PDF",
    h1: "Convert Word to PDF Online Free",
    desc: "Upload DOC or DOCX and get a PDF that mirrors your layout when page images are present, with a fast, free workflow in the browser. Processing stays on your device, with no file storage after you download.",
    features: [
      { icon: "🔄", title: "Reverse of PDF→Word", text: "HTML .doc from our converter and many .docx files export page-by-page to PDF." },
      { icon: "🖼️", title: "Layout kept", text: "Embedded images become full PDF pages at matching size when available." },
      { icon: "📝", title: "Text fallback", text: "Image-free .docx or .txt becomes a simple text PDF (pick page size)." }
    ],
    related: ["pdf-to-word", "word-counter"],
    example: "Upload the .doc from PDF→Word, or a .docx, and download a layout-matched PDF."
  },
  "image-crop": {
    title: "Image Crop",
    h1: "Crop Image Online Free",
    desc: "Crop image online free by selecting the exact area you want to keep. Adjust dimensions and focus for social posts, web use, or uploads in a fast workflow. Files are processed securely and are not stored after processing.",
    features: [
      { icon: "✂️", title: "Custom Crop", text: "Set exact crop area coordinates." },
      { icon: "🖼️", title: "Image Ready", text: "Download cropped output instantly." },
      { icon: "⚡", title: "Fast Tool", text: "Simple browser-side processing." }
    ],
    related: ["image-resize", "image-compress"]
  },
  "case-converter": {
    title: "Case Converter",
    h1: "Case Converter Online Free",
    desc: "See uppercase, lowercase, and camelCase versions of your text at once, ready to copy. It keeps routine case work fast and free whether you are editing prose, aligning sentence- or title-style plans, naming code identifiers, or tightening SEO copy.",
    features: [
      { icon: "🔤", title: "Upper & lower", text: "Full uppercase and lowercase from the same input." },
      { icon: "🧩", title: "camelCase", text: "Build camelCase strings for variables and keys." },
      { icon: "⚡", title: "Live previews", text: "All formats update as you type, with copy buttons." }
    ],
    related: ["word-counter", "slug-generator"]
  },
  "slug-generator": {
    title: "Slug Generator",
    h1: "Slug Generator Online Free",
    desc: "Turn titles and phrases into URL-friendly slugs with spaces and special characters stripped away. Build cleaner, SEO-minded links in seconds—this tool is fast, free, and ready whenever you publish or refactor routes.",
    features: [
      { icon: "🔗", title: "SEO-friendly", text: "Clean, lowercase, hyphenated slugs." },
      { icon: "🧹", title: "Auto Cleanup", text: "Removes unsupported characters." },
      { icon: "⚡", title: "Instant Result", text: "Paste text and copy slug quickly." }
    ],
    related: ["case-converter", "word-counter"]
  },
  "age-calculator": {
    title: "Age Calculator",
    h1: "Age Calculator Online Free",
    desc: "Find your age from your date of birth with exact years, months, and days. Compare to today or any other date you choose. The tool is fast, free, and straightforward so you get simple, accurate results every time.",
    features: [
      { icon: "🎂", title: "Birthday Mode", text: "Calculate age from date of birth." },
      { icon: "🕒", title: "Date Range", text: "Compare past date to now or a custom future date." },
      { icon: "⚡", title: "Simple Tool", text: "Fast and mobile-friendly." }
    ],
    related: ["password-generator", "word-counter", "calculator"]
  },
  "calculator": {
    title: "Calculator",
    h1: "Scientific Online Calculator Free – Math, Trig, Logs, and Memory",
    desc: "Build full expressions with parentheses, powers, roots, factorials, π and e, plus sin/cos/tan and inverse trig (DEG or RAD), common and natural logarithms, abs, and memory keys. It runs entirely in your browser with a layout that adapts to Toolker light and dark mode—ideal for coursework, budgets, and quick engineering-style checks without installing software.",
    features: [
      { icon: "∑", title: "Expression math", text: "Parentheses, powers (^), sqrt, and factorial (n!) in one line." },
      { icon: "📐", title: "Trig & logs", text: "sin, cos, tan, sin⁻¹, cos⁻¹, tan⁻¹, log, ln—switch DEG or RAD." },
      { icon: "🧠", title: "Memory keys", text: "MC, MR, M+, M−, and MS for multi-step totals." }
    ],
    related: ["currency-converter", "age-calculator"],
    example: "Try 142 × 3, then press equals—or chain operations like 12 + 7 − 4 before you copy the result."
  },
  "currency-converter": {
    title: "Currency Converter",
    h1: "Currency Converter Online Free",
    desc: "Switch between currencies online with live exchange rates from trusted APIs. It is fast, free, and ideal for checking USD, EUR, GBP, TRY, and many more pairs before you send money or plan a trip.",
    features: [
      { icon: "💱", title: "Live Rates", text: "Uses online exchange data." },
      { icon: "🌍", title: "Global Currencies", text: "Convert major currency pairs." },
      { icon: "⚡", title: "Quick Convert", text: "Instant calculation results." }
    ],
    related: ["qr-code-generator", "age-calculator", "calculator"],
    example: "Choose any two currencies, enter an amount, and get an instant live conversion."
  },
};

export const TOOL_ROUTES = {
  "jpg-to-pdf": "/pdf-tools/jpg-to-pdf/",
  "merge-pdf": "/pdf-tools/merge-pdf/",
  "compress-pdf": "/pdf-tools/compress-pdf/",
  "split-pdf": "/pdf-tools/split-pdf/",
  "pdf-to-word": "/pdf-tools/pdf-to-word/",
  "image-compress": "/image-tools/image-compress/",
  "image-resize": "/image-tools/image-resize/",
  "image-converter": "/image-tools/image-converter/",
  "svg-to-3d": "/image-tools/svg-to-3d/",
  "qr-code-generator": "/generator-tools/qr-code-generator/",
  "password-generator": "/generator-tools/password-generator/",
  "word-counter": "/text-tools/word-counter/"
  ,
  "pdf-rotate": "/pdf-tools/pdf-rotate/",
  "pdf-delete-pages": "/pdf-tools/pdf-delete-pages/",
  "pdf-watermark": "/pdf-tools/pdf-watermark/",
  "pdf-to-jpg": "/pdf-tools/pdf-to-jpg/",
  "word-to-pdf": "/pdf-tools/word-to-pdf/",
  "image-crop": "/image-tools/image-crop/",
  "case-converter": "/text-tools/case-converter/",
  "slug-generator": "/text-tools/slug-generator/",
  "age-calculator": "/generator-tools/age-calculator/",
  "calculator": "/generator-tools/calculator/",
  "currency-converter": "/generator-tools/currency-converter/"
};

export const BRAND_NAME = "Toolker";
export const BRAND_EMAIL = "support@toolker.com";
export const BRAND_HANDLE = "@toolker";
export const BRAND_IMAGE_CACHE = new Map();

export const TOOL_ICONS = {
  "merge pdf": "🧩",
  "split pdf": "✂️",
  "compress pdf": "🗜️",
  "jpg to pdf": "🖼️",
  "pdf to word": "📝",
  "pdf rotate": "🔄",
  "pdf page delete": "🗑️",
  "pdf watermark": "💧",
  "pdf to jpg": "🖼️",
  "word to pdf": "📝",
  "image compress": "🗜️",
  "image resize": "📐",
  "image crop": "✂️",
  "image converter": "🔁",
  "svg to 3d": "📦",
  "qr generator": "🔳",
  "qr code generator": "🔳",
  "password generator": "🔐",
  "word / character counter": "🔤",
  "case converter": "🔠",
  "slug generator": "🔗",
  "age calculator": "🎂",
  "calculator": "🔢",
  "currency converter": "💱",
  "word / character counter online": "🔤",
  "word character counter": "🔤",
  "pdf tools": "📄",
  "image tools": "🖼️",
  "generator tools": "⚙️",
  "text tools": "✍️"
};

export const TOOL_ICON_IMAGES = {
  "pdf watermark": "assets/tool-icons/pdf-watermark.png",
  "split pdf": "assets/tool-icons/split-pdf.png",
  "qr generator": "assets/tool-icons/qr-generator.png",
  "qr code generator": "assets/tool-icons/qr-generator.png"
};