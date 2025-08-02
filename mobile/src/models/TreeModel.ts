import DatabaseManager from '../database/DatabaseManager';
import { LocationCoordinates } from '../services/LocationService';

export interface Tree {
  id: string;
  species_id?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  diameter_breast_height?: number;
  total_height?: number;
  crown_diameter?: number;
  trunk_circumference?: number;
  age_estimate?: number;
  health_status?: string;
  location_description?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  synced: number;
}

export interface CreateTreeData {
  species_id?: string;
  location: LocationCoordinates;
  diameter_breast_height?: number;
  total_height?: number;
  crown_diameter?: number;
  trunk_circumference?: number;
  age_estimate?: number;
  health_status?: string;
  location_description?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  created_by?: string;
}

export class TreeModel {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  /**
   * Cria uma nova árvore
   */
  async create(data: CreateTreeData): Promise<Tree> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const tree: Tree = {
      id,
      species_id: data.species_id,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      altitude: data.location.altitude,
      accuracy: data.location.accuracy,
      diameter_breast_height: data.diameter_breast_height,
      total_height: data.total_height,
      crown_diameter: data.crown_diameter,
      trunk_circumference: data.trunk_circumference,
      age_estimate: data.age_estimate,
      health_status: data.health_status,
      location_description: data.location_description,
      address: data.address,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
      created_at: now,
      updated_at: now,
      created_by: data.created_by,
      synced: 0,
    };

    const sql = `
      INSERT INTO trees (
        id, species_id, latitude, longitude, altitude, accuracy,
        diameter_breast_height, total_height, crown_diameter, trunk_circumference,
        age_estimate, health_status, location_description, address, neighborhood,
        city, state, postal_code, created_at, updated_at, created_by, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      tree.id, tree.species_id, tree.latitude, tree.longitude, tree.altitude, tree.accuracy,
      tree.diameter_breast_height, tree.total_height, tree.crown_diameter, tree.trunk_circumference,
      tree.age_estimate, tree.health_status, tree.location_description, tree.address, tree.neighborhood,
      tree.city, tree.state, tree.postal_code, tree.created_at, tree.updated_at, tree.created_by, tree.synced
    ];

    await this.db.executeQuery(sql, params);
    console.log('🌳 Árvore criada:', tree.id);
    return tree;
  }

  /**
   * Busca árvore por ID
   */
  async findById(id: string): Promise<Tree | null> {
    const sql = 'SELECT * FROM trees WHERE id = ?';
    const result = await this.db.executeQuery(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTree(result.rows.item(0));
  }

  /**
   * Lista todas as árvores
   */
  async findAll(limit?: number, offset?: number): Promise<Tree[]> {
    let sql = 'SELECT * FROM trees ORDER BY created_at DESC';
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
    const trees: Tree[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      trees.push(this.mapRowToTree(result.rows.item(i)));
    }

    return trees;
  }

  /**
   * Busca árvores por proximidade geográfica
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 1
  ): Promise<Tree[]> {
    // Cálculo aproximado usando coordenadas
    const latDelta = radiusKm / 111; // 1 grau ≈ 111 km
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

    const sql = `
      SELECT * FROM trees 
      WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
      ORDER BY created_at DESC
    `;

    const params = [
      latitude - latDelta,
      latitude + latDelta,
      longitude - lonDelta,
      longitude + lonDelta
    ];

    const result = await this.db.executeQuery(sql, params);
    const trees: Tree[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      trees.push(this.mapRowToTree(result.rows.item(i)));
    }

    return trees;
  }

  /**
   * Busca árvores não sincronizadas
   */
  async findUnsyncedTrees(): Promise<Tree[]> {
    const sql = 'SELECT * FROM trees WHERE synced = 0 ORDER BY created_at ASC';
    const result = await this.db.executeQuery(sql);
    const trees: Tree[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      trees.push(this.mapRowToTree(result.rows.item(i)));
    }

    return trees;
  }

  /**
   * Atualiza uma árvore
   */
  async update(id: string, data: Partial<CreateTreeData>): Promise<Tree | null> {
    const existingTree = await this.findById(id);
    if (!existingTree) {
      return null;
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    // Construir query dinâmica
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'location') {
        updates.push('latitude = ?', 'longitude = ?');
        params.push(value.latitude, value.longitude);
        if (value.altitude !== undefined) {
          updates.push('altitude = ?');
          params.push(value.altitude);
        }
        if (value.accuracy !== undefined) {
          updates.push('accuracy = ?');
          params.push(value.accuracy);
        }
      } else if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    updates.push('updated_at = ?', 'synced = ?');
    params.push(now, 0);
    params.push(id);

    const sql = `UPDATE trees SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.executeQuery(sql, params);

    console.log('🌳 Árvore atualizada:', id);
    return await this.findById(id);
  }

  /**
   * Marca árvore como sincronizada
   */
  async markAsSynced(id: string): Promise<void> {
    const sql = 'UPDATE trees SET synced = 1 WHERE id = ?';
    await this.db.executeQuery(sql, [id]);
  }

  /**
   * Deleta uma árvore
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM trees WHERE id = ?';
    const result = await this.db.executeQuery(sql, [id]);
    
    console.log('🗑️ Árvore deletada:', id);
    return result.rowsAffected > 0;
  }

  /**
   * Conta total de árvores
   */
  async count(): Promise<number> {
    const sql = 'SELECT COUNT(*) as total FROM trees';
    const result = await this.db.executeQuery(sql);
    return result.rows.item(0).total;
  }

  /**
   * Conta árvores não sincronizadas
   */
  async countUnsynced(): Promise<number> {
    const sql = 'SELECT COUNT(*) as total FROM trees WHERE synced = 0';
    const result = await this.db.executeQuery(sql);
    return result.rows.item(0).total;
  }

  /**
   * Busca árvores por filtros
   */
  async findByFilters(filters: {
    species_id?: string;
    health_status?: string;
    city?: string;
    state?: string;
    created_by?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<Tree[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'date_from') {
          conditions.push('created_at >= ?');
          params.push(value);
        } else if (key === 'date_to') {
          conditions.push('created_at <= ?');
          params.push(value);
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    let sql = 'SELECT * FROM trees';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';

    const result = await this.db.executeQuery(sql, params);
    const trees: Tree[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      trees.push(this.mapRowToTree(result.rows.item(i)));
    }

    return trees;
  }

  /**
   * Mapeia linha do banco para objeto Tree
   */
  private mapRowToTree(row: any): Tree {
    return {
      id: row.id,
      species_id: row.species_id,
      latitude: row.latitude,
      longitude: row.longitude,
      altitude: row.altitude,
      accuracy: row.accuracy,
      diameter_breast_height: row.diameter_breast_height,
      total_height: row.total_height,
      crown_diameter: row.crown_diameter,
      trunk_circumference: row.trunk_circumference,
      age_estimate: row.age_estimate,
      health_status: row.health_status,
      location_description: row.location_description,
      address: row.address,
      neighborhood: row.neighborhood,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      synced: row.synced,
    };
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default TreeModel;