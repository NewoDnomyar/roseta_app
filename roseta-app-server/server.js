const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route to serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Utility function to fetch and embed an image
async function addImage(doc, url, x, y, width, height) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    doc.image(buffer, x, y, { width: width, height: height });
}

// PDF generation route
app.post('/generate-pdf', async (req, res) => {
    const { images } = req.body;

    // Initialize the PDF document
    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 0 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=collage.pdf');
        res.send(pdfData);
    });

    // Set credit card dimensions in millimeters (A4 page is 210mm x 297mm)
    const cardWidth = 85.6;
    const cardHeight = 53.98;
    const margin = 5; // margin between cards

    // Position for 3x3 grid on A4
    const positions = [
        { x: margin, y: margin },
        { x: cardWidth + 2 * margin, y: margin },
        { x: 2 * (cardWidth + margin), y: margin },
        { x: margin, y: cardHeight + 2 * margin },
        { x: cardWidth + 2 * margin, y: cardHeight + 2 * margin },
        { x: 2 * (cardWidth + margin), y: cardHeight + 2 * margin },
        { x: margin, y: 2 * (cardHeight + margin) },
        { x: cardWidth + 2 * margin, y: 2 * (cardHeight + margin) },
        { x: 2 * (cardWidth + margin), y: 2 * (cardHeight + margin) },
    ];

    // Add images to the first page (front)
    for (let i = 0; i < 9 && i < images.length; i++) {
        await addImage(doc, images[i].url, positions[i].x, positions[i].y, cardWidth, cardHeight);
    }

    // Add a new page for the back
    if (images.length > 9) {
        doc.addPage({ size: 'A4', layout: 'portrait', margin: 0 });

        for (let i = 9; i < 18 && i < images.length; i++) {
            await addImage(doc, images[i].url, positions[i - 9].x, positions[i - 9].y, cardWidth, cardHeight);
        }
    }

    // Finalize the PDF and end the stream
    doc.end();
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
