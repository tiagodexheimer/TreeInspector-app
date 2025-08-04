const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const logger = require('../utils/logger');

/**
 * Serviço de Geração de Relatórios
 * Gera relatórios em PDF e CSV para inspeções de árvores
 */
class ReportService {
  constructor(db) {
    this.db = db;
    this.reportsDir = path.join(__dirname, '../../reports');
    this.templatesDir = path.join(__dirname, '../../templates');
    
    // Criar diretórios se não existirem
    this.ensureDirectories();
  }

  /**
   * Garante que os diretórios necessários existam
   */
  ensureDirectories() {
    [this.reportsDir, this.templatesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Gera relatório de inspeção individual em PDF
   * @param {number} inspectionId - ID da inspeção
   * @param {Object} options - Opções do relatório
   * @returns {Promise<string>} Caminho do arquivo gerado
   */
  async generateInspectionPDF(inspectionId, options = {}) {
    try {
      // Buscar dados da inspeção
      const inspectionData = await this.getInspectionData(inspectionId);
      
      if (!inspectionData) {
        throw new Error(`Inspeção ${inspectionId} não encontrada`);
      }

      // Gerar nome do arquivo
      const fileName = `inspecao_${inspectionId}_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);

      // Criar documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Relatório de Inspeção - ${inspectionData.tree.id}`,
          Author: 'TreeInspector',
          Subject: 'Relatório de Inspeção de Árvore',
          Creator: 'TreeInspector System'
        }
      });

      // Stream para arquivo
      doc.pipe(fs.createWriteStream(filePath));

      // Gerar conteúdo do PDF
      await this.generateInspectionPDFContent(doc, inspectionData, options);

      // Finalizar documento
      doc.end();

      logger.info('PDF inspection report generated', {
        inspectionId,
        fileName,
        filePath
      });

      return filePath;

    } catch (error) {
      logger.error('Error generating inspection PDF', {
        inspectionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Gera conteúdo do PDF de inspeção
   * @param {PDFDocument} doc - Documento PDF
   * @param {Object} data - Dados da inspeção
   * @param {Object} options - Opções
   */
  async generateInspectionPDFContent(doc, data, options) {
    const { inspection, tree, species, riskAssessment, photos } = data;

    // Cabeçalho
    this.addPDFHeader(doc, 'RELATÓRIO DE INSPEÇÃO DE ÁRVORE');

    // Informações básicas
    doc.fontSize(14).font('Helvetica-Bold')
       .text('INFORMAÇÕES GERAIS', 50, doc.y + 20);

    doc.fontSize(10).font('Helvetica')
       .text(`ID da Árvore: ${tree.id}`, 50, doc.y + 10)
       .text(`Data da Inspeção: ${new Date(inspection.inspection_date).toLocaleDateString('pt-BR')}`, 50, doc.y + 5)
       .text(`Inspetor: ${inspection.inspector_name || 'N/A'}`, 50, doc.y + 5)
       .text(`Localização: ${tree.location_description || 'N/A'}`, 50, doc.y + 5)
       .text(`Coordenadas: ${tree.latitude}, ${tree.longitude}`, 50, doc.y + 5);

    // Dados da espécie
    if (species) {
      doc.fontSize(14).font('Helvetica-Bold')
         .text('IDENTIFICAÇÃO DA ESPÉCIE', 50, doc.y + 20);

      doc.fontSize(10).font('Helvetica')
         .text(`Nome Científico: ${species.scientific_name}`, 50, doc.y + 10)
         .text(`Nome Popular: ${species.common_name || 'N/A'}`, 50, doc.y + 5)
         .text(`Família: ${species.family || 'N/A'}`, 50, doc.y + 5);
    }

    // Dados dendrométricos
    doc.fontSize(14).font('Helvetica-Bold')
       .text('DADOS DENDROMÉTRICOS', 50, doc.y + 20);

    doc.fontSize(10).font('Helvetica')
       .text(`DAP (Diâmetro à Altura do Peito): ${tree.diameter_breast_height || 'N/A'} cm`, 50, doc.y + 10)
       .text(`Altura Total: ${tree.total_height || 'N/A'} m`, 50, doc.y + 5)
       .text(`Diâmetro da Copa: ${tree.crown_diameter || 'N/A'} m`, 50, doc.y + 5);

    // Condições estruturais
    doc.fontSize(14).font('Helvetica-Bold')
       .text('AVALIAÇÃO ESTRUTURAL', 50, doc.y + 20);

    const conditions = {
      'Condição do Tronco': inspection.trunk_condition,
      'Condição das Raízes': inspection.root_condition,
      'Condição da Copa': inspection.crown_condition,
      'Condição dos Galhos': inspection.branch_condition
    };

    Object.entries(conditions).forEach(([label, value]) => {
      if (value) {
        doc.fontSize(10).font('Helvetica')
           .text(`${label}: ${this.formatCondition(value)}`, 50, doc.y + 5);
      }
    });

    // Problemas fitossanitários
    if (inspection.pest_severity || inspection.disease_severity) {
      doc.fontSize(14).font('Helvetica-Bold')
         .text('PROBLEMAS FITOSSANITÁRIOS', 50, doc.y + 20);

      if (inspection.pest_severity) {
        doc.fontSize(10).font('Helvetica')
           .text(`Severidade de Pragas: ${this.formatSeverity(inspection.pest_severity)}`, 50, doc.y + 10);
      }

      if (inspection.disease_severity) {
        doc.fontSize(10).font('Helvetica')
           .text(`Severidade de Doenças: ${this.formatSeverity(inspection.disease_severity)}`, 50, doc.y + 5);
      }
    }

    // Avaliação de risco
    if (riskAssessment) {
      doc.fontSize(14).font('Helvetica-Bold')
         .text('AVALIAÇÃO DE RISCO (ABNT NBR 16246-3)', 50, doc.y + 20);

      doc.fontSize(10).font('Helvetica')
         .text(`Nível de Risco: ${riskAssessment.riskLevel} (${riskAssessment.riskValue}/5)`, 50, doc.y + 10)
         .text(`Probabilidade: ${riskAssessment.probability}/5`, 50, doc.y + 5)
         .text(`Consequência: ${riskAssessment.consequence}/5`, 50, doc.y + 5)
         .text(`Ação Recomendada: ${riskAssessment.recommendedAction}`, 50, doc.y + 5);

      if (riskAssessment.nextInspectionDate) {
        doc.text(`Próxima Inspeção: ${new Date(riskAssessment.nextInspectionDate).toLocaleDateString('pt-BR')}`, 50, doc.y + 5);
      }
    }

    // Recomendações
    if (inspection.recommendations) {
      doc.fontSize(14).font('Helvetica-Bold')
         .text('RECOMENDAÇÕES', 50, doc.y + 20);

      doc.fontSize(10).font('Helvetica')
         .text(inspection.recommendations, 50, doc.y + 10, {
           width: 500,
           align: 'justify'
         });
    }

    // Observações
    if (inspection.notes) {
      doc.fontSize(14).font('Helvetica-Bold')
         .text('OBSERVAÇÕES', 50, doc.y + 20);

      doc.fontSize(10).font('Helvetica')
         .text(inspection.notes, 50, doc.y + 10, {
           width: 500,
           align: 'justify'
         });
    }

    // Fotos (se incluídas)
    if (options.includePhotos && photos && photos.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold')
         .text('DOCUMENTAÇÃO FOTOGRÁFICA', 50, 50);

      let yPosition = 80;
      for (const photo of photos.slice(0, 4)) { // Máximo 4 fotos por página
        try {
          if (fs.existsSync(photo.file_path)) {
            doc.image(photo.file_path, 50, yPosition, {
              width: 200,
              height: 150
            });

            doc.fontSize(8).font('Helvetica')
               .text(`${photo.category} - ${new Date(photo.taken_at).toLocaleDateString('pt-BR')}`, 
                     50, yPosition + 155);

            yPosition += 180;
            if (yPosition > 600) break; // Evitar overflow da página
          }
        } catch (error) {
          logger.warn('Error adding photo to PDF', { photoId: photo.id, error: error.message });
        }
      }
    }

    // Rodapé
    this.addPDFFooter(doc, inspection);
  }

  /**
   * Gera relatório consolidado em CSV
   * @param {Object} filters - Filtros para o relatório
   * @param {Object} options - Opções do relatório
   * @returns {Promise<string>} Caminho do arquivo gerado
   */
  async generateConsolidatedCSV(filters = {}, options = {}) {
    try {
      // Buscar dados das inspeções
      const inspections = await this.getInspectionsData(filters);

      // Gerar nome do arquivo
      const fileName = `relatorio_consolidado_${Date.now()}.csv`;
      const filePath = path.join(this.reportsDir, fileName);

      // Configurar CSV writer
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'tree_id', title: 'ID Árvore' },
          { id: 'inspection_date', title: 'Data Inspeção' },
          { id: 'inspector_name', title: 'Inspetor' },
          { id: 'scientific_name', title: 'Nome Científico' },
          { id: 'common_name', title: 'Nome Popular' },
          { id: 'location_description', title: 'Localização' },
          { id: 'latitude', title: 'Latitude' },
          { id: 'longitude', title: 'Longitude' },
          { id: 'diameter_breast_height', title: 'DAP (cm)' },
          { id: 'total_height', title: 'Altura (m)' },
          { id: 'crown_diameter', title: 'Diâmetro Copa (m)' },
          { id: 'trunk_condition', title: 'Condição Tronco' },
          { id: 'root_condition', title: 'Condição Raízes' },
          { id: 'crown_condition', title: 'Condição Copa' },
          { id: 'branch_condition', title: 'Condição Galhos' },
          { id: 'pest_severity', title: 'Severidade Pragas' },
          { id: 'disease_severity', title: 'Severidade Doenças' },
          { id: 'general_health', title: 'Saúde Geral' },
          { id: 'risk_level', title: 'Nível Risco' },
          { id: 'risk_value', title: 'Valor Risco' },
          { id: 'recommended_action', title: 'Ação Recomendada' },
          { id: 'recommendations', title: 'Recomendações' },
          { id: 'notes', title: 'Observações' }
        ],
        encoding: 'utf8'
      });

      // Processar dados para CSV
      const csvData = inspections.map(item => ({
        tree_id: item.tree_id,
        inspection_date: new Date(item.inspection_date).toLocaleDateString('pt-BR'),
        inspector_name: item.inspector_name || '',
        scientific_name: item.scientific_name || '',
        common_name: item.common_name || '',
        location_description: item.location_description || '',
        latitude: item.latitude || '',
        longitude: item.longitude || '',
        diameter_breast_height: item.diameter_breast_height || '',
        total_height: item.total_height || '',
        crown_diameter: item.crown_diameter || '',
        trunk_condition: this.formatCondition(item.trunk_condition),
        root_condition: this.formatCondition(item.root_condition),
        crown_condition: this.formatCondition(item.crown_condition),
        branch_condition: this.formatCondition(item.branch_condition),
        pest_severity: this.formatSeverity(item.pest_severity),
        disease_severity: this.formatSeverity(item.disease_severity),
        general_health: item.general_health || '',
        risk_level: item.risk_level || '',
        risk_value: item.risk_value || '',
        recommended_action: item.recommended_action || '',
        recommendations: item.recommendations || '',
        notes: item.notes || ''
      }));

      // Escrever arquivo CSV
      await csvWriter.writeRecords(csvData);

      logger.info('CSV consolidated report generated', {
        fileName,
        filePath,
        recordsCount: csvData.length
      });

      return filePath;

    } catch (error) {
      logger.error('Error generating consolidated CSV', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Busca dados de uma inspeção específica
   * @param {number} inspectionId - ID da inspeção
   * @returns {Promise<Object>} Dados da inspeção
   */
  async getInspectionData(inspectionId) {
    const query = `
      SELECT 
        i.*,
        t.*,
        s.scientific_name,
        s.common_name,
        s.family,
        u.name as inspector_name,
        ra.risk_level,
        ra.risk_value,
        ra.probability,
        ra.consequence,
        ra.recommended_action,
        ra.next_inspection_date
      FROM inspections i
      JOIN trees t ON i.tree_id = t.id
      LEFT JOIN species s ON t.species_id = s.id
      LEFT JOIN users u ON i.inspector_id = u.id
      LEFT JOIN risk_assessments ra ON i.id = ra.inspection_id
      WHERE i.id = ?
    `;

    const results = await this.db.query(query, [inspectionId]);
    
    if (results.length === 0) {
      return null;
    }

    const inspection = results[0];

    // Buscar fotos da inspeção
    const photosQuery = `
      SELECT * FROM photos 
      WHERE inspection_id = ? 
      ORDER BY category, taken_at
    `;
    const photos = await this.db.query(photosQuery, [inspectionId]);

    return {
      inspection,
      tree: inspection,
      species: inspection.scientific_name ? inspection : null,
      riskAssessment: inspection.risk_level ? {
        riskLevel: inspection.risk_level,
        riskValue: inspection.risk_value,
        probability: inspection.probability,
        consequence: inspection.consequence,
        recommendedAction: inspection.recommended_action,
        nextInspectionDate: inspection.next_inspection_date
      } : null,
      photos
    };
  }

  /**
   * Busca dados de inspeções para relatório consolidado
   * @param {Object} filters - Filtros
   * @returns {Promise<Array>} Lista de inspeções
   */
  async getInspectionsData(filters) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Aplicar filtros
    if (filters.startDate) {
      whereClause += ' AND i.inspection_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ' AND i.inspection_date <= ?';
      params.push(filters.endDate);
    }

    if (filters.inspectorId) {
      whereClause += ' AND i.inspector_id = ?';
      params.push(filters.inspectorId);
    }

    if (filters.riskLevel) {
      whereClause += ' AND ra.risk_value >= ?';
      params.push(filters.riskLevel);
    }

    if (filters.neighborhood) {
      whereClause += ' AND t.neighborhood ILIKE ?';
      params.push(`%${filters.neighborhood}%`);
    }

    const query = `
      SELECT 
        i.*,
        t.id as tree_id,
        t.latitude,
        t.longitude,
        t.diameter_breast_height,
        t.total_height,
        t.crown_diameter,
        t.location_description,
        t.neighborhood,
        s.scientific_name,
        s.common_name,
        u.name as inspector_name,
        ra.risk_level,
        ra.risk_value,
        ra.recommended_action
      FROM inspections i
      JOIN trees t ON i.tree_id = t.id
      LEFT JOIN species s ON t.species_id = s.id
      LEFT JOIN users u ON i.inspector_id = u.id
      LEFT JOIN risk_assessments ra ON i.id = ra.inspection_id
      ${whereClause}
      ORDER BY i.inspection_date DESC
      LIMIT ${filters.limit || 1000}
    `;

    return await this.db.query(query, params);
  }

  /**
   * Adiciona cabeçalho ao PDF
   * @param {PDFDocument} doc - Documento PDF
   * @param {string} title - Título do relatório
   */
  addPDFHeader(doc, title) {
    // Logo (se existir)
    const logoPath = path.join(this.templatesDir, 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 30, { width: 100 });
    }

    // Título
    doc.fontSize(18).font('Helvetica-Bold')
       .text(title, 200, 50);

    // Data de geração
    doc.fontSize(10).font('Helvetica')
       .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 200, 75);

    // Linha separadora
    doc.moveTo(50, 100)
       .lineTo(550, 100)
       .stroke();
  }

  /**
   * Adiciona rodapé ao PDF
   * @param {PDFDocument} doc - Documento PDF
   * @param {Object} inspection - Dados da inspeção
   */
  addPDFFooter(doc, inspection) {
    const pageHeight = doc.page.height;
    
    // Linha separadora
    doc.moveTo(50, pageHeight - 80)
       .lineTo(550, pageHeight - 80)
       .stroke();

    // Informações do sistema
    doc.fontSize(8).font('Helvetica')
       .text('TreeInspector - Sistema de Gestão de Árvores Urbanas', 50, pageHeight - 70)
       .text(`Relatório ID: ${inspection.id} | Página 1`, 50, pageHeight - 60)
       .text('Este documento foi gerado automaticamente pelo sistema TreeInspector', 50, pageHeight - 50);
  }

  /**
   * Formata condição estrutural
   * @param {string} condition - Condição
   * @returns {string} Condição formatada
   */
  formatCondition(condition) {
    const conditions = {
      excellent: 'Excelente',
      good: 'Boa',
      fair: 'Regular',
      poor: 'Ruim',
      critical: 'Crítica'
    };
    return conditions[condition] || condition || 'N/A';
  }

  /**
   * Formata severidade
   * @param {number} severity - Severidade (0-4)
   * @returns {string} Severidade formatada
   */
  formatSeverity(severity) {
    if (severity === null || severity === undefined) return 'N/A';
    
    const severities = {
      0: 'Nenhuma',
      1: 'Baixa',
      2: 'Moderada',
      3: 'Alta',
      4: 'Severa'
    };
    return severities[severity] || severity.toString();
  }

  /**
   * Lista relatórios gerados
   * @param {Object} filters - Filtros
   * @returns {Promise<Array>} Lista de relatórios
   */
  async listReports(filters = {}) {
    try {
      const files = fs.readdirSync(this.reportsDir);
      
      const reports = files
        .filter(file => file.endsWith('.pdf') || file.endsWith('.csv'))
        .map(file => {
          const filePath = path.join(this.reportsDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            fileName: file,
            filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            type: path.extname(file).substring(1).toUpperCase()
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      return reports;

    } catch (error) {
      logger.error('Error listing reports', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove relatório
   * @param {string} fileName - Nome do arquivo
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async deleteReport(fileName) {
    try {
      const filePath = path.join(this.reportsDir, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('Report deleted', { fileName, filePath });
        return true;
      }
      
      return false;

    } catch (error) {
      logger.error('Error deleting report', { fileName, error: error.message });
      throw error;
    }
  }

  /**
   * Limpa relatórios antigos
   * @param {number} daysToKeep - Dias para manter
   * @returns {Promise<number>} Número de arquivos removidos
   */
  async cleanupOldReports(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.reportsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.reportsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.birthtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      logger.info('Old reports cleaned up', { deletedCount, daysToKeep });
      return deletedCount;

    } catch (error) {
      logger.error('Error cleaning up old reports', { error: error.message });
      throw error;
    }
  }
}

module.exports = ReportService;