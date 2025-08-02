const logger = require('../utils/logger');

/**
 * Serviço de Avaliação de Risco conforme ABNT NBR 16246-3
 * Implementa a metodologia brasileira para avaliação de risco de árvores urbanas
 */
class RiskAssessmentService {
  constructor() {
    // Matriz de risco ABNT NBR 16246-3 (5x5)
    this.riskMatrix = [
      [1, 1, 2, 2, 3], // Probabilidade 1 (Muito Baixa)
      [1, 2, 2, 3, 4], // Probabilidade 2 (Baixa)
      [2, 2, 3, 4, 4], // Probabilidade 3 (Moderada)
      [2, 3, 4, 4, 5], // Probabilidade 4 (Alta)
      [3, 4, 4, 5, 5], // Probabilidade 5 (Muito Alta)
    ];

    // Definições dos níveis de risco
    this.riskLevels = {
      1: { level: 'Muito Baixo', color: '#4CAF50', action: 'Monitoramento de rotina' },
      2: { level: 'Baixo', color: '#8BC34A', action: 'Monitoramento periódico' },
      3: { level: 'Moderado', color: '#FFC107', action: 'Intervenção programada' },
      4: { level: 'Alto', color: '#FF9800', action: 'Intervenção prioritária' },
      5: { level: 'Muito Alto', color: '#F44336', action: 'Intervenção imediata' },
    };

    // Fatores de probabilidade de falha
    this.probabilityFactors = {
      structural: {
        trunk: {
          excellent: 0,
          good: 1,
          fair: 2,
          poor: 3,
          critical: 4,
        },
        roots: {
          excellent: 0,
          good: 1,
          fair: 2,
          poor: 3,
          critical: 4,
        },
        crown: {
          excellent: 0,
          good: 1,
          fair: 2,
          poor: 3,
          critical: 4,
        },
        branches: {
          excellent: 0,
          good: 1,
          fair: 2,
          poor: 3,
          critical: 4,
        },
      },
      environmental: {
        wind_exposure: {
          protected: 0,
          moderate: 1,
          exposed: 2,
          very_exposed: 3,
        },
        soil_conditions: {
          excellent: 0,
          good: 1,
          fair: 2,
          poor: 3,
        },
        construction_damage: {
          none: 0,
          minor: 1,
          moderate: 2,
          severe: 3,
        },
      },
      biological: {
        pest_severity: {
          none: 0,
          low: 1,
          moderate: 2,
          high: 3,
          severe: 4,
        },
        disease_severity: {
          none: 0,
          low: 1,
          moderate: 2,
          high: 3,
          severe: 4,
        },
      },
    };

    // Fatores de consequência
    this.consequenceFactors = {
      target: {
        none: 1,
        occasional: 2,
        intermittent: 3,
        frequent: 4,
        constant: 5,
      },
      property_value: {
        low: 1,
        moderate: 2,
        high: 3,
        very_high: 4,
        exceptional: 5,
      },
      traffic_volume: {
        none: 1,
        low: 2,
        moderate: 3,
        high: 4,
        very_high: 5,
      },
    };
  }

  /**
   * Calcula o risco usando a matriz ABNT NBR 16246-3
   * @param {number} probability - Probabilidade de falha (1-5)
   * @param {number} consequence - Consequência (1-5)
   * @returns {Object} Resultado da avaliação de risco
   */
  calculateRiskMatrix(probability, consequence) {
    try {
      // Validar entrada
      if (!this.isValidRiskValue(probability) || !this.isValidRiskValue(consequence)) {
        throw new Error('Probabilidade e consequência devem estar entre 1 e 5');
      }

      const riskValue = this.riskMatrix[probability - 1][consequence - 1];
      const riskInfo = this.riskLevels[riskValue];

      const result = {
        probability,
        consequence,
        riskValue,
        riskLevel: riskInfo.level,
        color: riskInfo.color,
        recommendedAction: riskInfo.action,
        matrix: {
          position: { row: probability - 1, col: consequence - 1 },
          description: `P${probability} x C${consequence} = R${riskValue}`,
        },
      };

      logger.info('Risk assessment calculated', {
        probability,
        consequence,
        riskValue,
        riskLevel: riskInfo.level,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating risk matrix', { error: error.message });
      throw error;
    }
  }

  /**
   * Avaliação completa de risco de uma árvore
   * @param {Object} treeData - Dados da árvore
   * @param {Object} inspectionData - Dados da inspeção
   * @returns {Object} Avaliação completa de risco
   */
  assessTreeRisk(treeData, inspectionData) {
    try {
      // Calcular probabilidade de falha
      const probabilityAssessment = this.calculateProbabilityOfFailure(inspectionData);
      
      // Calcular consequência
      const consequenceAssessment = this.calculateConsequence(treeData, inspectionData);
      
      // Calcular risco final
      const riskAssessment = this.calculateRiskMatrix(
        probabilityAssessment.level,
        consequenceAssessment.level
      );

      // Gerar recomendações específicas
      const recommendations = this.generateRecommendations(
        probabilityAssessment,
        consequenceAssessment,
        riskAssessment
      );

      const result = {
        treeId: treeData.id,
        assessmentDate: new Date().toISOString(),
        probability: probabilityAssessment,
        consequence: consequenceAssessment,
        risk: riskAssessment,
        recommendations,
        nextInspectionDate: this.calculateNextInspectionDate(riskAssessment.riskValue),
        inspector: inspectionData.inspector_id,
      };

      logger.info('Complete tree risk assessment completed', {
        treeId: treeData.id,
        riskLevel: riskAssessment.riskLevel,
        riskValue: riskAssessment.riskValue,
      });

      return result;
    } catch (error) {
      logger.error('Error in complete tree risk assessment', { 
        treeId: treeData.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Calcula probabilidade de falha baseada na inspeção
   * @param {Object} inspectionData - Dados da inspeção
   * @returns {Object} Avaliação de probabilidade
   */
  calculateProbabilityOfFailure(inspectionData) {
    const factors = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Avaliação estrutural
    const structuralFactors = [
      { name: 'Tronco', condition: inspectionData.trunk_condition, weight: 3 },
      { name: 'Raízes', condition: inspectionData.root_condition, weight: 3 },
      { name: 'Copa', condition: inspectionData.crown_condition, weight: 2 },
      { name: 'Galhos', condition: inspectionData.branch_condition, weight: 2 },
    ];

    structuralFactors.forEach(factor => {
      if (factor.condition) {
        const score = this.probabilityFactors.structural.trunk[factor.condition] || 0;
        const weightedScore = score * factor.weight;
        totalScore += weightedScore;
        maxPossibleScore += 4 * factor.weight; // 4 é o máximo (critical)
        
        factors.push({
          category: 'Estrutural',
          factor: factor.name,
          condition: factor.condition,
          score,
          weight: factor.weight,
          weightedScore,
        });
      }
    });

    // Avaliação biológica
    if (inspectionData.pest_severity !== undefined) {
      const pestScore = Math.min(inspectionData.pest_severity, 4);
      totalScore += pestScore * 2;
      maxPossibleScore += 4 * 2;
      
      factors.push({
        category: 'Biológica',
        factor: 'Pragas',
        severity: inspectionData.pest_severity,
        score: pestScore,
        weight: 2,
        weightedScore: pestScore * 2,
      });
    }

    if (inspectionData.disease_severity !== undefined) {
      const diseaseScore = Math.min(inspectionData.disease_severity, 4);
      totalScore += diseaseScore * 2;
      maxPossibleScore += 4 * 2;
      
      factors.push({
        category: 'Biológica',
        factor: 'Doenças',
        severity: inspectionData.disease_severity,
        score: diseaseScore,
        weight: 2,
        weightedScore: diseaseScore * 2,
      });
    }

    // Converter para escala 1-5
    const probabilityPercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const probabilityLevel = this.convertPercentageToLevel(probabilityPercentage);

    return {
      level: probabilityLevel,
      percentage: Math.round(probabilityPercentage),
      totalScore,
      maxPossibleScore,
      factors,
      description: this.getProbabilityDescription(probabilityLevel),
    };
  }

  /**
   * Calcula consequência baseada no contexto urbano
   * @param {Object} treeData - Dados da árvore
   * @param {Object} inspectionData - Dados da inspeção
   * @returns {Object} Avaliação de consequência
   */
  calculateConsequence(treeData, inspectionData) {
    const factors = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Fatores de consequência baseados na localização e contexto
    const consequenceFactors = [
      {
        name: 'Presença de Alvos',
        value: this.assessTargetPresence(treeData),
        weight: 4,
      },
      {
        name: 'Volume de Tráfego',
        value: this.assessTrafficVolume(treeData),
        weight: 3,
      },
      {
        name: 'Valor da Propriedade',
        value: this.assessPropertyValue(treeData),
        weight: 2,
      },
      {
        name: 'Tamanho da Árvore',
        value: this.assessTreeSize(treeData),
        weight: 3,
      },
    ];

    consequenceFactors.forEach(factor => {
      const weightedScore = factor.value * factor.weight;
      totalScore += weightedScore;
      maxPossibleScore += 5 * factor.weight; // 5 é o máximo
      
      factors.push({
        factor: factor.name,
        value: factor.value,
        weight: factor.weight,
        weightedScore,
      });
    });

    // Converter para escala 1-5
    const consequencePercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const consequenceLevel = this.convertPercentageToLevel(consequencePercentage);

    return {
      level: consequenceLevel,
      percentage: Math.round(consequencePercentage),
      totalScore,
      maxPossibleScore,
      factors,
      description: this.getConsequenceDescription(consequenceLevel),
    };
  }

  /**
   * Avalia presença de alvos (pessoas, propriedades)
   * @param {Object} treeData - Dados da árvore
   * @returns {number} Nível de presença de alvos (1-5)
   */
  assessTargetPresence(treeData) {
    // Lógica baseada na descrição da localização
    const location = (treeData.location_description || '').toLowerCase();
    
    if (location.includes('escola') || location.includes('hospital') || location.includes('shopping')) {
      return 5; // Constant
    }
    if (location.includes('praça') || location.includes('parque') || location.includes('avenida')) {
      return 4; // Frequent
    }
    if (location.includes('rua') || location.includes('residencial')) {
      return 3; // Intermittent
    }
    if (location.includes('industrial') || location.includes('comercial')) {
      return 2; // Occasional
    }
    
    return 1; // None/Rural
  }

  /**
   * Avalia volume de tráfego
   * @param {Object} treeData - Dados da árvore
   * @returns {number} Nível de tráfego (1-5)
   */
  assessTrafficVolume(treeData) {
    const location = (treeData.location_description || '').toLowerCase();
    
    if (location.includes('avenida') || location.includes('rodovia') || location.includes('marginal')) {
      return 5; // Very High
    }
    if (location.includes('rua principal') || location.includes('centro')) {
      return 4; // High
    }
    if (location.includes('rua') || location.includes('bairro')) {
      return 3; // Moderate
    }
    if (location.includes('residencial') || location.includes('vila')) {
      return 2; // Low
    }
    
    return 1; // None
  }

  /**
   * Avalia valor da propriedade
   * @param {Object} treeData - Dados da árvore
   * @returns {number} Nível de valor (1-5)
   */
  assessPropertyValue(treeData) {
    const neighborhood = (treeData.neighborhood || '').toLowerCase();
    
    // Lógica simplificada - em produção, integraria com dados imobiliários
    if (neighborhood.includes('jardins') || neighborhood.includes('morumbi') || neighborhood.includes('leblon')) {
      return 5; // Exceptional
    }
    if (neighborhood.includes('centro') || neighborhood.includes('comercial')) {
      return 4; // Very High
    }
    
    return 3; // Moderate (padrão)
  }

  /**
   * Avalia tamanho da árvore
   * @param {Object} treeData - Dados da árvore
   * @returns {number} Nível baseado no tamanho (1-5)
   */
  assessTreeSize(treeData) {
    const height = treeData.total_height || 0;
    const diameter = treeData.diameter_breast_height || 0;
    
    // Árvores grandes têm maior potencial de dano
    if (height > 20 || diameter > 80) {
      return 5; // Very Large
    }
    if (height > 15 || diameter > 60) {
      return 4; // Large
    }
    if (height > 10 || diameter > 40) {
      return 3; // Medium
    }
    if (height > 5 || diameter > 20) {
      return 2; // Small
    }
    
    return 1; // Very Small
  }

  /**
   * Converte porcentagem para nível 1-5
   * @param {number} percentage - Porcentagem (0-100)
   * @returns {number} Nível (1-5)
   */
  convertPercentageToLevel(percentage) {
    if (percentage >= 80) return 5;
    if (percentage >= 60) return 4;
    if (percentage >= 40) return 3;
    if (percentage >= 20) return 2;
    return 1;
  }

  /**
   * Gera recomendações baseadas na avaliação
   * @param {Object} probability - Avaliação de probabilidade
   * @param {Object} consequence - Avaliação de consequência
   * @param {Object} risk - Avaliação de risco
   * @returns {Array} Lista de recomendações
   */
  generateRecommendations(probability, consequence, risk) {
    const recommendations = [];

    // Recomendações baseadas no nível de risco
    switch (risk.riskValue) {
      case 5:
        recommendations.push({
          priority: 'CRÍTICA',
          action: 'Remoção imediata ou isolamento da área',
          timeframe: 'Imediato (24h)',
          type: 'safety',
        });
        break;
      case 4:
        recommendations.push({
          priority: 'ALTA',
          action: 'Intervenção prioritária - poda ou remoção',
          timeframe: '1-2 semanas',
          type: 'maintenance',
        });
        break;
      case 3:
        recommendations.push({
          priority: 'MÉDIA',
          action: 'Programar intervenção - poda ou tratamento',
          timeframe: '1-3 meses',
          type: 'maintenance',
        });
        break;
      case 2:
        recommendations.push({
          priority: 'BAIXA',
          action: 'Monitoramento periódico',
          timeframe: '6 meses',
          type: 'monitoring',
        });
        break;
      case 1:
        recommendations.push({
          priority: 'ROTINA',
          action: 'Monitoramento de rotina',
          timeframe: '12 meses',
          type: 'monitoring',
        });
        break;
    }

    // Recomendações específicas baseadas nos fatores
    probability.factors.forEach(factor => {
      if (factor.score >= 3) {
        recommendations.push({
          priority: 'ESPECÍFICA',
          action: `Tratar problema: ${factor.factor} - ${factor.condition || 'Severidade ' + factor.severity}`,
          timeframe: 'Conforme prioridade geral',
          type: 'treatment',
          category: factor.category,
        });
      }
    });

    return recommendations;
  }

  /**
   * Calcula próxima data de inspeção
   * @param {number} riskValue - Valor do risco (1-5)
   * @returns {string} Data da próxima inspeção
   */
  calculateNextInspectionDate(riskValue) {
    const now = new Date();
    let monthsToAdd;

    switch (riskValue) {
      case 5: monthsToAdd = 1; break;  // 1 mês
      case 4: monthsToAdd = 3; break;  // 3 meses
      case 3: monthsToAdd = 6; break;  // 6 meses
      case 2: monthsToAdd = 12; break; // 1 ano
      case 1: monthsToAdd = 24; break; // 2 anos
      default: monthsToAdd = 12;
    }

    const nextDate = new Date(now);
    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
    
    return nextDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Valida se o valor está na faixa correta (1-5)
   * @param {number} value - Valor a validar
   * @returns {boolean} True se válido
   */
  isValidRiskValue(value) {
    return Number.isInteger(value) && value >= 1 && value <= 5;
  }

  /**
   * Obtém descrição da probabilidade
   * @param {number} level - Nível de probabilidade
   * @returns {string} Descrição
   */
  getProbabilityDescription(level) {
    const descriptions = {
      1: 'Muito baixa probabilidade de falha',
      2: 'Baixa probabilidade de falha',
      3: 'Probabilidade moderada de falha',
      4: 'Alta probabilidade de falha',
      5: 'Muito alta probabilidade de falha',
    };
    return descriptions[level] || 'Probabilidade não definida';
  }

  /**
   * Obtém descrição da consequência
   * @param {number} level - Nível de consequência
   * @returns {string} Descrição
   */
  getConsequenceDescription(level) {
    const descriptions = {
      1: 'Consequências muito baixas',
      2: 'Consequências baixas',
      3: 'Consequências moderadas',
      4: 'Consequências altas',
      5: 'Consequências muito altas',
    };
    return descriptions[level] || 'Consequência não definida';
  }

  /**
   * Obtém matriz de risco completa para referência
   * @returns {Object} Matriz de risco com descrições
   */
  getRiskMatrixReference() {
    return {
      matrix: this.riskMatrix,
      levels: this.riskLevels,
      description: 'Matriz de Risco ABNT NBR 16246-3',
      axes: {
        probability: {
          1: 'Muito Baixa',
          2: 'Baixa',
          3: 'Moderada',
          4: 'Alta',
          5: 'Muito Alta',
        },
        consequence: {
          1: 'Muito Baixa',
          2: 'Baixa',
          3: 'Moderada',
          4: 'Alta',
          5: 'Muito Alta',
        },
      },
    };
  }
}

module.exports = RiskAssessmentService;