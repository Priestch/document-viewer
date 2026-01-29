# Build PDF Viewer Based on Image

It's intuitive to build a PDF viewer based on images when you only got limited time and resources. This approach can be effective for simple use cases, such as displaying static documents or creating a lightweight viewer without advanced features.

The PDF file format is complex, it includes lots of features like search, document-level navigation, annotations, interactive forms, digital signatures, etc. The image-based approach simplifies the rendering process by converting each page of the PDF into an image, but it also make it harder to implement advanced features.

## Success Story

[PSPDFKit](https://www.nutrient.io/sdk/) (now known as Nutrient), is one of the most popular commercial PDF SDK built on top of image-based rendering approach. Its creator is [Christoph Kappestein](https://twitter.com/kappeschaaf), known for Moltbot (Formerly Clawdbot).
