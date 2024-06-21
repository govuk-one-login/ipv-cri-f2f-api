import sys
from PyPDF2 import PdfMerger

def merge_pdfs(paths, output):
    pdf_merger = PdfMerger()
    for path in paths:
        pdf_merger.append(path)
    with open(output, 'wb') as fileobj:
        pdf_merger.write(fileobj)

if __name__ == '__main__':
    paths = sys.argv[1:-1]
    output = sys.argv[-1]
    merge_pdfs(paths, output)
