import io
import csv
from datetime import datetime
from typing import List, Dict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER


class ExportService:
    @staticmethod
    def generate_csv(stats: Dict, queue_name: str) -> str:
        """Generate CSV export of queue statistics"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['QUEUE Statistics Report'])
        writer.writerow(['File d\'attente', queue_name])
        writer.writerow(['Date du rapport', datetime.now().strftime('%d/%m/%Y %H:%M')])
        writer.writerow([])
        
        # Statistics
        writer.writerow(['Métrique', 'Valeur'])
        writer.writerow(['Total de tickets émis', stats.get('total_tickets', 0)])
        writer.writerow(['Personnes en attente', stats.get('waiting', 0)])
        writer.writerow(['Personnes servies', stats.get('served', 0)])
        
        avg_wait = stats.get('average_wait_time')
        if avg_wait:
            writer.writerow(['Temps d\'attente moyen', f"{round(avg_wait)} minutes"])
        else:
            writer.writerow(['Temps d\'attente moyen', 'N/A'])
        
        return output.getvalue()

    @staticmethod
    def generate_pdf(stats: Dict, queue_name: str) -> bytes:
        """Generate PDF export of queue statistics"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#4F46E5'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Title
        title = Paragraph("📊 QUEUE - Rapport de Statistiques", title_style)
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        # Queue info
        info_style = styles['Normal']
        info_style.fontSize = 12
        elements.append(Paragraph(f"<b>File d'attente:</b> {queue_name}", info_style))
        elements.append(Paragraph(f"<b>Date du rapport:</b> {datetime.now().strftime('%d/%m/%Y à %H:%M')}", info_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Statistics table
        data = [
            ['Métrique', 'Valeur'],
            ['Total de tickets émis', str(stats.get('total_tickets', 0))],
            ['Personnes en attente', str(stats.get('waiting', 0))],
            ['Personnes servies', str(stats.get('served', 0))],
        ]
        
        avg_wait = stats.get('average_wait_time')
        if avg_wait:
            data.append(['Temps d\'attente moyen', f"{round(avg_wait)} minutes"])
        else:
            data.append(['Temps d\'attente moyen', 'N/A'])
        
        table = Table(data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F46E5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 11),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.5*inch))
        
        # Footer
        footer_style = styles['Italic']
        footer_style.fontSize = 9
        footer_style.textColor = colors.grey
        footer = Paragraph("Généré automatiquement par QUEUE - Système de gestion de files d'attente", footer_style)
        elements.append(footer)
        
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes