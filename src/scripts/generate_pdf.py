import sys
import weasyprint

def generate_pdf(html_file, output_pdf):
    with open(html_file, 'r') as file:
        html_content = file.read()
    
    pdf = weasyprint.HTML(string=html_content).write_pdf()
    
    with open(output_pdf, 'wb') as file:
        file.write(pdf)
    
    print(f'PDF generated successfully and saved as {output_pdf}')

if __name__ == "__main__":
    html_file = sys.argv[1]
    output_pdf = sys.argv[2]
    generate_pdf(html_file, output_pdf)
