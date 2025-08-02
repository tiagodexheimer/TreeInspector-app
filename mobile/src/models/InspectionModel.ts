import DatabaseManager from '../database/DatabaseManager';
import { PhotoData } from '../services/CameraService';

export interface Inspection {
  id: string;
  tree_id: string;
  inspector_id: string;
  inspection_date: string;
  inspection_type: string;
  weather_conditions?: string;
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
  
  // Avaliação estrutural
  trunk_condition?: string;
  trunk_defects?: string;
  root_condition?: string;
  root_defects?: string;
  crown_condition?: string;
  crown_defects?: string;
  branch_condition?: string;
  branch_defects?: string;
  
  // Avaliação fitossanitária
  pest_presence?: string;
  disease_presence?: string;
  pest_severity?: number;
  disease_severity?: number;
  
  // Avaliação de risco ABNT
  risk_level: number;
  risk_factors?: string;
  probability_failure?: number;
  consequence_failure?: number;
  risk_matrix_result?: number;
  
  // Recomendações
  recommendations?: string;
  priority_level?: number;
  next_inspection_date?: string;
  
  // Observações
  general_observations?: string;
  equipment_used?: string;
  
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface CreateInspectionData {
  tree_id: string;
  inspector_id: string;
  inspection_type: string;
  weather_conditions?: string;
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
  
  // Avaliação estrutural
  trunk_condition?: string;
  trunk_defects?: string;
  root_condition?: string;
  root_defects?: string;
  crown_condition?: string;
  crown_defects?: string;
  branch_condition?: string;
  branch_defects?: string;
  
  // Avaliação fitossanitária
  pest_presence?: string;
  disease_presence?: string;
  pest_severity?: number;
  disease_severity?: number;
  
  // Avaliação de risco ABNT
  risk_level: number;
  risk_factors?: string;
  probability_failure?: number;
  consequence_failure?: number;
  risk_matrix_result?: number;
  
  // Recomendações
  recommendations?: string;
  priority_level?: number;
  next_inspection_date?: string;
  
  // Observações
  general_observations?: string;
  equipment_used?: string;
}

export enum InspectionType {
  ROUTINE = 'routine',
  DETAILED = 'detailed',
  EMERGENCY = 'emergency',
  POST_STORM = 'post_storm',
  FOLLOW_UP = 'follow_up'
}

export enum RiskLevel {
  VERY_LOW = 1,
  LOW = 2,
  MODERATE = 3,
  HIGH = 4,
  VERY_HIGH = 5
}

export enum ConditionStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

export class InspectionModel {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  /**
   * Cria uma nova inspeção
   */
  async create(data: CreateInspectionData): Promise<Inspection> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const inspection: Inspection = {
      id,
      tree_id: data.tree_id,
      inspector_id: data.inspector_id,
      inspection_date: now,
      inspection_type: data.inspection_type,
      weather_conditions: data.weather_conditions,
      temperature: data.temperature,
      humidity: data.humidity,
      wind_speed: data.wind_speed,
      
      trunk_condition: data.trunk_condition,
      trunk_defects: data.trunk_defects,
      root_condition: data.root_condition,
      root_defects: data.root_defects,
      crown_condition: data.crown_condition,
      crown_defects: data.crown_defects,
      branch_condition: data.branch_condition,
      branch_defects: data.branch_defects,
      
      pest_presence: data.pest_presence,
      disease_presence: data.disease_presence,
      pest_severity: data.pest_severity,
      disease_severity: data.disease_severity,
      
      risk_level: data.risk_level,
      risk_factors: data.risk_factors,
      probability_failure: data.probability_failure,
      consequence_failure: data.consequence_failure,
      risk_matrix_result: data.risk_matrix_result,
      
      recommendations: data.recommendations,
      priority_level: data.priority_level,
      next_inspection_date: data.next_inspection_date,
      
      general_observations: data.general_observations,
      equipment_used: data.equipment_used,
      
      created_at: now,
      updated_at: now,
      synced: 0,
    };

    const sql = `
      INSERT INTO inspections (
        id, tree_id, inspector_id, inspection_date, inspection_type,
        weather_conditions, temperature, humidity, wind_speed,
        trunk_condition, trunk_defects, root_condition, root_defects,
        crown_condition, crown_defects, branch_condition, branch_defects,
        pest_presence, disease_presence, pest_severity, disease_severity,
        risk_level, risk_factors, probability_failure, consequence_failure, risk_matrix_result,
        recommendations, priority_level, next_inspection_date,
        general_observations, equipment_used,
        created_at, updated_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      inspection.id, inspection.tree_id, inspection.inspector_id, inspection.inspection_date, inspection.inspection_type,
      inspection.weather_conditions, inspection.temperature, inspection.humidity, inspection.wind_speed,
      inspection.trunk_condition, inspection.trunk_defects, inspection.root_condition, inspection.root_defects,
      inspection.crown_condition, inspection.crown_defects, inspection.branch_condition, inspection.branch_defects,
      inspection.pest_presence, inspection.disease_presence, inspection.pest_severity, inspection.disease_severity,
      inspection.risk_level, inspection.risk_factors, inspection.probability_failure, inspection.consequence_failure, inspection.risk_matrix_result,
      inspection.recommendations, inspection.priority_level, inspection.next_inspection_date,
      inspection.general_observations, inspection.equipment_used,
      inspection.created_at, inspection.updated_at, inspection.synced
    ];

    await this.db.executeQuery(sql, params);
    console.log('📋 Inspeção criada:', inspection.id);
    return inspection;
  }

  /**
   * Busca inspeção por ID
   */
  async findById(id: string): Promise<Inspection | null> {
    const sql = 'SELECT * FROM inspections WHERE id = ?';
    const result = await this.db.executeQuery(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToInspection(result.rows.item(0));
  }

  /**
   * Lista inspeções por árvore
   */
  async findByTreeId(treeId: string): Promise<Inspection[]> {
    const sql = 'SELECT * FROM inspections WHERE tree_id = ? ORDER BY inspection_date DESC';
    const result = await this.db.executeQuery(sql, [treeId]);
    const inspections: Inspection[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      inspections.push(this.mapRowToInspection(result.rows.item(i)));
    }

    return inspections;
  }

  /**
   * Lista inspeções por inspetor
   */
  async findByInspectorId(inspectorId: string): Promise<Inspection[]> {
    const sql = 'SELECT * FROM inspections WHERE inspector_id = ? ORDER BY inspection_date DESC';
    const result = await this.db.executeQuery(sql, [inspectorId]);
    const inspections: Inspection[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      inspections.push(this.mapRowToInspection(result.rows.item(i)));
    }

    return inspections;
  }

  /**
   * Lista todas as inspeções
   */
  async findAll(limit?: number, offset?: number): Promise<Inspection[]> {
    let sql = 'SELECT * FROM inspections ORDER BY inspection_date DESC';
    const params: any[] = [];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    }

    const result = await this.db.executeQuery(sql, params);
    const inspections: Inspection[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      inspections.push(this.mapRowToInspection(result.rows.item(i)));
    }

    return inspections;
  }

  /**
   * Busca inspeções não sincronizadas
   */
  async findUnsyncedInspections(): Promise<Inspection[]> {
    const sql = 'SELECT * FROM inspections WHERE synced = 0 ORDER BY created_at ASC';
    const result = await this.db.executeQuery(sql);
    const inspections: Inspection[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      inspections.push(this.mapRowToInspection(result.rows.item(i)));
    }

    return inspections;
  }

  /**
   * Busca inspeções por nível de risco
   */
  async findByRiskLevel(riskLevel: number): Promise<Inspection[]> {
    const sql = 'SELECT * FROM inspections WHERE risk_level = ? ORDER BY inspection_date DESC';
    const result = await this.db.executeQuery(sql, [riskLevel]);
    const inspections: Inspection[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      inspections.push(this.mapRowToInspection(result.rows.item(i)));
    }

    return inspections;
  }

  /**
   * Busca inspeções por período
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Inspection[]> {
    const sql = `
      SELECT * FROM inspections 
      WHERE inspection_date BETWEEN ? AND ? 
      ORDER BY inspection_date DESC
    `;
    const result = await this.db.executeQuery(sql, [startDate, endDate]);
    const inspections: Inspection[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      inspections.push(this.mapRowToInspection(result.rows.item(i)));
    }

    return inspections;
  }

  /**
   * Atualiza uma inspeção
   */
  async update(id: string, data: Partial<CreateInspectionData>): Promise<Inspection | null> {
    const existingInspection = await this.findById(id);
    if (!existingInspection) {
      return null;
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    // Construir query dinâmica
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    updates.push('updated_at = ?', 'synced = ?');
    params.push(now, 0);
    params.push(id);

    const sql = `UPDATE inspections SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.executeQuery(sql, params);

    console.log('📋 Inspeção atualizada:', id);
    return await this.findById(id);
  }

  /**
   * Marca inspeção como sincronizada
   */
  async markAsSynced(id: string): Promise<void> {
    const sql = 'UPDATE inspections SET synced = 1 WHERE id = ?';
    await this.db.executeQuery(sql, [id]);
  }

  /**
   * Deleta uma inspeção
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM inspections WHERE id = ?';
    const result = await this.db.executeQuery(sql, [id]);
    
    console.log('🗑️ Inspeção deletada:', id);
    return result.rowsAffected > 0;
  }

  /**
   * Conta total de inspeções
   */
  async count(): Promise<number> {
    const sql = 'SELECT COUNT(*) as total FROM inspections';
    const result = await this.db.executeQuery(sql);
    return result.rows.item(0).total;
  }

  /**
   * Conta inspeções não sincronizadas
   */
  async countUnsynced(): Promise<number> {
    const sql = 'SELECT COUNT(*) as total FROM inspections WHERE synced = 0';
    const result = await this.db.executeQuery(sql);
    return result.rows.item(0).total;
  }

  /**
   * Estatísticas de inspeções por risco
   */
  async getRiskStatistics(): Promise<{ [key: number]: number }> {
    const sql = 'SELECT risk_level, COUNT(*) as count FROM inspections GROUP BY risk_level';
    const result = await this.db.executeQuery(sql);
    const stats: { [key: number]: number } = {};

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      stats[row.risk_level] = row.count;
    }

    return stats;
  }

  /**
   * Última inspeção de uma árvore
   */
  async getLastInspectionForTree(treeId: string): Promise<Inspection | null> {
    const sql = `
      SELECT * FROM inspections 
      WHERE tree_id = ? 
      ORDER BY inspection_date DESC 
      LIMIT 1
    `;
    const result = await this.db.executeQuery(sql, [treeId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToInspection(result.rows.item(0));
  }

  /**
   * Calcula matriz de risco ABNT
   */
  calculateRiskMatrix(probability: number, consequence: number): number {
    // Matriz de risco ABNT NBR 16246-3
    const riskMatrix = [
      [1, 1, 2, 2, 3], // Probabilidade 1
      [1, 2, 2, 3, 4], // Probabilidade 2
      [2, 2, 3, 4, 4], // Probabilidade 3
      [2, 3, 4, 4, 5], // Probabilidade 4
      [3, 4, 4, 5, 5], // Probabilidade 5
    ];

    if (probability < 1 || probability > 5 || consequence < 1 || consequence > 5) {
      throw new Error('Probabilidade e consequência devem estar entre 1 e 5');
    }

    return riskMatrix[probability - 1][consequence - 1];
  }

  /**
   * Mapeia linha do banco para objeto Inspection
   */
  private mapRowToInspection(row: any): Inspection {
    return {
      id: row.id,
      tree_id: row.tree_id,
      inspector_id: row.inspector_id,
      inspection_date: row.inspection_date,
      inspection_type: row.inspection_type,
      weather_conditions: row.weather_conditions,
      temperature: row.temperature,
      humidity: row.humidity,
      wind_speed: row.wind_speed,
      
      trunk_condition: row.trunk_condition,
      trunk_defects: row.trunk_defects,
      root_condition: row.root_condition,
      root_defects: row.root_defects,
      crown_condition: row.crown_condition,
      crown_defects: row.crown_defects,
      branch_condition: row.branch_condition,
      branch_defects: row.branch_defects,
      
      pest_presence: row.pest_presence,
      disease_presence: row.disease_presence,
      pest_severity: row.pest_severity,
      disease_severity: row.disease_severity,
      
      risk_level: row.risk_level,
      risk_factors: row.risk_factors,
      probability_failure: row.probability_failure,
      consequence_failure: row.consequence_failure,
      risk_matrix_result: row.risk_matrix_result,
      
      recommendations: row.recommendations,
      priority_level: row.priority_level,
      next_inspection_date: row.next_inspection_date,
      
      general_observations: row.general_observations,
      equipment_used: row.equipment_used,
      
      created_at: row.created_at,
      updated_at: row.updated_at,
      synced: row.synced,
    };
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `inspection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default InspectionModel;