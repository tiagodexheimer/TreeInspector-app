const axios = require('axios');

class GBIFService {
  constructor() {
    this.baseUrl = process.env.GBIF_API_URL || 'https://api.gbif.org/v1';
    this.timeout = 15000; // 15 segundos
  }

  /**
   * Busca espécies por nome científico
   * @param {string} scientificName - Nome científico da espécie
   * @param {Object} options - Opções de busca
   * @returns {Promise<Object>} Resultado da busca
   */
  async searchSpeciesByName(scientificName, options = {}) {
    try {
      const params = {
        q: scientificName,
        rank: options.rank || 'SPECIES',
        status: options.status || 'ACCEPTED',
        limit: options.limit || 20,
        offset: options.offset || 0,
        ...options.additionalParams,
      };

      const response = await axios.get(`${this.baseUrl}/species/search`, {
        params,
        timeout: this.timeout,
      });

      const result = this.processSpeciesSearchResult(response.data);
      
      console.log('🔬 GBIF species search completed:', {
        query: scientificName,
        resultsCount: result.results.length,
        totalCount: result.count,
      });

      return result;
    } catch (error) {
      console.error('❌ GBIF species search error:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Obtém detalhes de uma espécie por ID
   * @param {number} speciesKey - Chave da espécie no GBIF
   * @returns {Promise<Object>} Detalhes da espécie
   */
  async getSpeciesDetails(speciesKey) {
    try {
      const [speciesResponse, vernacularResponse, distributionResponse] = await Promise.allSettled([
        axios.get(`${this.baseUrl}/species/${speciesKey}`, { timeout: this.timeout }),
        axios.get(`${this.baseUrl}/species/${speciesKey}/vernacularNames`, { timeout: this.timeout }),
        axios.get(`${this.baseUrl}/species/${speciesKey}/distributions`, { timeout: this.timeout }),
      ]);

      const species = speciesResponse.status === 'fulfilled' ? speciesResponse.value.data : null;
      const vernacular = vernacularResponse.status === 'fulfilled' ? vernacularResponse.value.data : { results: [] };
      const distribution = distributionResponse.status === 'fulfilled' ? distributionResponse.value.data : { results: [] };

      if (!species) {
        throw new Error(`Espécie não encontrada: ${speciesKey}`);
      }

      const result = this.processSpeciesDetails(species, vernacular.results, distribution.results);
      
      console.log('🔬 GBIF species details retrieved:', {
        speciesKey,
        scientificName: result.scientificName,
        vernacularNamesCount: result.vernacularNames.length,
      });

      return result;
    } catch (error) {
      console.error('❌ GBIF species details error:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Busca ocorrências de uma espécie
   * @param {number} speciesKey - Chave da espécie
   * @param {Object} options - Opções de busca
   * @returns {Promise<Object>} Ocorrências da espécie
   */
  async getSpeciesOccurrences(speciesKey, options = {}) {
    try {
      const params = {
        taxonKey: speciesKey,
        hasCoordinate: options.hasCoordinate !== false,
        hasGeospatialIssue: false,
        limit: options.limit || 20,
        offset: options.offset || 0,
        country: options.country,
        year: options.year,
        ...options.additionalParams,
      };

      const response = await axios.get(`${this.baseUrl}/occurrence/search`, {
        params,
        timeout: this.timeout,
      });

      const result = this.processOccurrencesResult(response.data);
      
      console.log('🔬 GBIF occurrences retrieved:', {
        speciesKey,
        occurrencesCount: result.results.length,
        totalCount: result.count,
      });

      return result;
    } catch (error) {
      console.error('❌ GBIF occurrences error:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Busca espécies por localização geográfica
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} radius - Raio em km
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Espécies na região
   */
  async getSpeciesByLocation(latitude, longitude, radius = 10, options = {}) {
    try {
      // Converter raio para graus (aproximadamente)
      const radiusDegrees = radius / 111; // 1 grau ≈ 111 km

      const params = {
        decimalLatitude: `${latitude - radiusDegrees},${latitude + radiusDegrees}`,
        decimalLongitude: `${longitude - radiusDegrees},${longitude + radiusDegrees}`,
        hasCoordinate: true,
        hasGeospatialIssue: false,
        limit: options.limit || 100,
        offset: options.offset || 0,
        ...options.additionalParams,
      };

      const response = await axios.get(`${this.baseUrl}/occurrence/search`, {
        params,
        timeout: this.timeout,
      });

      // Agrupar por espécie
      const speciesMap = new Map();
      
      for (const occurrence of response.data.results) {
        if (occurrence.speciesKey && occurrence.species) {
          if (!speciesMap.has(occurrence.speciesKey)) {
            speciesMap.set(occurrence.speciesKey, {
              speciesKey: occurrence.speciesKey,
              scientificName: occurrence.species,
              kingdom: occurrence.kingdom,
              phylum: occurrence.phylum,
              class: occurrence.class,
              order: occurrence.order,
              family: occurrence.family,
              genus: occurrence.genus,
              occurrenceCount: 0,
              locations: [],
            });
          }
          
          const species = speciesMap.get(occurrence.speciesKey);
          species.occurrenceCount++;
          
          if (occurrence.decimalLatitude && occurrence.decimalLongitude) {
            species.locations.push({
              latitude: occurrence.decimalLatitude,
              longitude: occurrence.decimalLongitude,
              country: occurrence.country,
              locality: occurrence.locality,
              recordedBy: occurrence.recordedBy,
              eventDate: occurrence.eventDate,
            });
          }
        }
      }

      const result = {
        searchArea: {
          center: { latitude, longitude },
          radius,
        },
        totalOccurrences: response.data.count,
        speciesCount: speciesMap.size,
        species: Array.from(speciesMap.values()),
      };

      console.log('🔬 GBIF location search completed:', {
        location: `${latitude}, ${longitude}`,
        radius,
        speciesFound: result.speciesCount,
        totalOccurrences: result.totalOccurrences,
      });

      return result;
    } catch (error) {
      console.error('❌ GBIF location search error:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Obtém taxonomia completa de uma espécie
   * @param {number} speciesKey - Chave da espécie
   * @returns {Promise<Object>} Taxonomia completa
   */
  async getSpeciesTaxonomy(speciesKey) {
    try {
      const response = await axios.get(`${this.baseUrl}/species/${speciesKey}`, {
        timeout: this.timeout,
      });

      const taxonomy = this.processTaxonomy(response.data);
      
      console.log('🔬 GBIF taxonomy retrieved:', {
        speciesKey,
        scientificName: taxonomy.scientificName,
        rank: taxonomy.rank,
      });

      return taxonomy;
    } catch (error) {
      console.error('❌ GBIF taxonomy error:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Processa resultado da busca de espécies
   * @param {Object} data - Dados brutos da API
   * @returns {Object} Resultado processado
   */
  processSpeciesSearchResult(data) {
    return {
      count: data.count,
      endOfRecords: data.endOfRecords,
      results: data.results.map(species => ({
        key: species.key,
        nubKey: species.nubKey,
        scientificName: species.scientificName,
        canonicalName: species.canonicalName,
        authorship: species.authorship,
        rank: species.rank,
        status: species.status,
        confidence: species.confidence,
        kingdom: species.kingdom,
        phylum: species.phylum,
        class: species.class,
        order: species.order,
        family: species.family,
        genus: species.genus,
        species: species.species,
      })),
    };
  }

  /**
   * Processa detalhes de uma espécie
   * @param {Object} species - Dados da espécie
   * @param {Array} vernacular - Nomes vernaculares
   * @param {Array} distribution - Distribuição
   * @returns {Object} Detalhes processados
   */
  processSpeciesDetails(species, vernacular, distribution) {
    return {
      key: species.key,
      scientificName: species.scientificName,
      canonicalName: species.canonicalName,
      authorship: species.authorship,
      rank: species.rank,
      status: species.status,
      taxonomy: {
        kingdom: species.kingdom,
        phylum: species.phylum,
        class: species.class,
        order: species.order,
        family: species.family,
        genus: species.genus,
        species: species.species,
      },
      vernacularNames: this.processVernacularNames(vernacular),
      distribution: this.processDistribution(distribution),
      descriptions: species.descriptions || [],
      references: species.references || [],
      synonyms: species.synonyms || [],
    };
  }

  /**
   * Processa nomes vernaculares
   * @param {Array} vernacular - Nomes vernaculares
   * @returns {Array} Nomes processados
   */
  processVernacularNames(vernacular) {
    return vernacular
      .filter(name => name.vernacularName)
      .map(name => ({
        name: name.vernacularName,
        language: name.language,
        country: name.country,
        source: name.source,
        preferred: name.preferred || false,
      }))
      .sort((a, b) => {
        // Priorizar português brasileiro
        if (a.language === 'pt' && b.language !== 'pt') return -1;
        if (b.language === 'pt' && a.language !== 'pt') return 1;
        if (a.preferred && !b.preferred) return -1;
        if (b.preferred && !a.preferred) return 1;
        return 0;
      });
  }

  /**
   * Processa distribuição geográfica
   * @param {Array} distribution - Dados de distribuição
   * @returns {Array} Distribuição processada
   */
  processDistribution(distribution) {
    return distribution.map(dist => ({
      country: dist.country,
      locality: dist.locality,
      establishmentMeans: dist.establishmentMeans,
      occurrenceStatus: dist.occurrenceStatus,
      source: dist.source,
    }));
  }

  /**
   * Processa resultado de ocorrências
   * @param {Object} data - Dados brutos
   * @returns {Object} Resultado processado
   */
  processOccurrencesResult(data) {
    return {
      count: data.count,
      endOfRecords: data.endOfRecords,
      results: data.results.map(occ => ({
        key: occ.key,
        speciesKey: occ.speciesKey,
        scientificName: occ.species,
        coordinates: {
          latitude: occ.decimalLatitude,
          longitude: occ.decimalLongitude,
          uncertainty: occ.coordinateUncertaintyInMeters,
        },
        location: {
          country: occ.country,
          stateProvince: occ.stateProvince,
          locality: occ.locality,
        },
        collection: {
          institutionCode: occ.institutionCode,
          collectionCode: occ.collectionCode,
          catalogNumber: occ.catalogNumber,
          recordedBy: occ.recordedBy,
          eventDate: occ.eventDate,
        },
        identification: {
          identifiedBy: occ.identifiedBy,
          dateIdentified: occ.dateIdentified,
        },
      })),
    };
  }

  /**
   * Processa taxonomia
   * @param {Object} species - Dados da espécie
   * @returns {Object} Taxonomia processada
   */
  processTaxonomy(species) {
    return {
      key: species.key,
      scientificName: species.scientificName,
      canonicalName: species.canonicalName,
      rank: species.rank,
      status: species.status,
      hierarchy: {
        kingdom: { key: species.kingdomKey, name: species.kingdom },
        phylum: { key: species.phylumKey, name: species.phylum },
        class: { key: species.classKey, name: species.class },
        order: { key: species.orderKey, name: species.order },
        family: { key: species.familyKey, name: species.family },
        genus: { key: species.genusKey, name: species.genus },
        species: { key: species.speciesKey, name: species.species },
      },
    };
  }

  /**
   * Trata erros da API
   * @param {Error} error - Erro original
   * @returns {Error} Erro tratado
   */
  handleApiError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return new Error(`Requisição inválida: ${data.message || 'Parâmetros incorretos'}`);
        case 404:
          return new Error('Recurso não encontrado no GBIF');
        case 429:
          return new Error('Limite de requisições excedido para GBIF');
        case 500:
          return new Error('Erro interno do servidor GBIF');
        default:
          return new Error(`Erro da API GBIF: ${status} - ${data.message || 'Erro desconhecido'}`);
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('Timeout na requisição para GBIF API');
    }

    if (error.code === 'ENOTFOUND') {
      return new Error('Não foi possível conectar com GBIF API');
    }

    return error;
  }

  /**
   * Verifica status da API GBIF
   * @returns {Promise<Object>} Status da API
   */
  async getApiStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/species/search`, {
        params: { q: 'test', limit: 1 },
        timeout: 5000,
      });

      return {
        status: 'active',
        responseTime: response.headers['x-response-time'] || 'unknown',
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}

module.exports = GBIFService;