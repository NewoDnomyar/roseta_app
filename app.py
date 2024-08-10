import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
from PIL import Image, ImageOps, UnidentifiedImageError
import img2pdf

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.secret_key = 'supersecretkey'

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    uploaded_files = request.files.getlist('file')

    if not uploaded_files:
        flash('No files uploaded.')
        return redirect(url_for('index'))

    canvas_width = 2550
    canvas_height = 3300
    margin_size = 75
    card_width = 1011
    card_height = 638

    canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
    positions = [(margin_size + i * (card_width + margin_size), 
                  margin_size + j * (card_height + margin_size)) 
                 for j in range(5) for i in range(2)]

    for idx, file in enumerate(uploaded_files):
        if idx >= len(positions):
            break
        try:
            img = Image.open(file)
            img = ImageOps.fit(img, (card_width, card_height), Image.LANCZOS)
            canvas.paste(img, positions[idx])
        except UnidentifiedImageError:
            flash(f"Cannot identify image file: {file.filename}")
            return redirect(url_for('index'))
        except Exception as e:
            flash(f"Error processing file {file.filename}: {str(e)}")
            return redirect(url_for('index'))

    formatted_image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'formatted_image.png')
    canvas.save(formatted_image_path)

    pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], 'formatted_document.pdf')
    with open(pdf_path, "wb") as f:
        f.write(img2pdf.convert(formatted_image_path))

    return send_file(pdf_path, mimetype='application/pdf')

if __name__ == '__main__':
    app.run(debug=True)
