const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class PlantNetService {
  constructor() {
    this.apiKey = process.env.PLANTNET_API_KEY;
    this.baseUrl = process.env.PLANTNET_API_URL || 'https://my-api.plantnet.org/v1/identify';
    this.project = 'weurope'; // Projeto padrão - pode ser configurado
    this.organs = ['leaf', 'flower', 'fruit', 'bark']; // Órgãos suportados
  }

  /**
   * Identifica espécie de planta através de fotos
   * @param {Array} images - Array de objetos com { path, organ }
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Resultado da identificação
   */
  async identifySpecies(images, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('PlantNet API key não configurada');
      }

      if (!images || images.length === 0) {
        throw new Error('Pelo menos uma imagem é necessária');
      }

      // Validar imagens
      this.validateImages(images);

      const formData = new FormData();
      
      // Adicionar imagens ao FormData
      for (const image of images) {
        if (!fs.existsSync(image.path)) {
          throw new Error(`Arquivo não encontrado: ${image.path}`);
        }
        
        formData.append('images', fs.createReadStream(image.path));
        formData.append('organs', image.organ || 'auto');
      }

      // Parâmetros adicionais
      formData.append('project', options.project || this.project);
      
      if (options.modifiers) {
        formData.append('modifiers', options.modifiers.join(','));
      }

      // Fazer requisição para PlantNet API
      const response = await axios.post(
        `${this.baseUrl}/${options.project || this.project}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Api-Key': this.apiKey,
          },
          params: {
            'include-related-images': options.includeRelatedImages || false,
            'no-reject': options.noReject || false,
            'nb-results': options.maxResults || 10,
            'lang': options.language || 'pt',
          },
          timeout: 30000, // 30 segundos
        }
      );

      // Processar resultado
      const result = this.processIdentificationResult(response.data);
      
      console.log('🌿 PlantNet identification completed:', {
        speciesCount: result.species.length,
        bestMatch: result.species[0]?.scientificNameWithoutAuthor,
        confidence: result.species[0]?.score,
      });

      return result;
    } catch (error) {
      console.error('❌ PlantNet identification error:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Valida as imagens fornecidas
   * @param {Array} images - Array de imagens
   */
  validateImages(images) {
    const maxImages = 5;
    const maxFileSize = 20 * 1024 * 1024; // 20MB
    const allowedFormats = ['.jpg', '.jpeg', '.png'];

    if (images.length > maxImages) {
      throw new Error(`Máximo de ${maxImages} imagens permitidas`);
    }

    for (const image of images) {
      if (!image.path) {
        throw new Error('Caminho da imagem é obrigatório');
      }

      // Verificar formato
      const extension = image.path.toLowerCase().substring(image.path.lastIndexOf('.'));
      if (!allowedFormats.includes(extension)) {
        throw new Error(`Formato não suportado: ${extension}. Use: ${allowedFormats.join(', ')}`);
      }

      // Verificar tamanho do arquivo
      if (fs.existsSync(image.path)) {
        const stats = fs.statSync(image.path);
        if (stats.size > maxFileSize) {
          throw new Error(`Arquivo muito grande: ${stats.size} bytes. Máximo: ${maxFileSize} bytes`);
        }
      }

      // Validar órgão
      if (image.organ && !this.organs.includes(image.organ) && image.organ !== 'auto') {
        throw new Error(`Órgão inválido: ${image.organ}. Use: ${this.organs.join(', ')} ou 'auto'`);
      }
    }
  }

  /**
   * Processa o resultado da identificação
   * @param {Object} data - Dados brutos da API
   * @returns {Object} Resultado processado
   */
  processIdentificationResult(data) {
    const result = {
      query: {
        project: data.query?.project,
        images: data.query?.images?.map(img => ({
          organ: img.organ,
          score: img.score,
        })) || [],
      },
      language: data.language,
      preferedReferential: data.preferedReferential,
      species: [],
      remainingIdentificationRequests: data.remainingIdentificationRequests,
    };

    // Processar espécies identificadas
    if (data.results && Array.isArray(data.results)) {
      result.species = data.results.map(species => ({
        score: species.score,
        scientificNameWithoutAuthor: species.species?.scientificNameWithoutAuthor,
        scientificNameAuthorship: species.species?.scientificNameAuthorship,
        genus: species.species?.genus?.scientificNameWithoutAuthor,
        family: species.species?.family?.scientificNameWithoutAuthor,
        commonNames: this.extractCommonNames(species.species?.commonNames),
        images: this.processSpeciesImages(species.images),
        gbifId: species.gbif?.id,
        iucnRedListCategory: species.iucn?.category,
      }));
    }

    return result;
  }

  /**
   * Extrai nomes comuns em português
   * @param {Array} commonNames - Array de nomes comuns
   * @returns {Array} Nomes em português
   */
  extractCommonNames(commonNames) {
    if (!commonNames || !Array.isArray(commonNames)) {
      return [];
    }

    return commonNames
      .filter(name => name.lang === 'pt' || name.lang === 'pt-BR')
      .map(name => name.value);
  }

  /**
   * Processa imagens das espécies
   * @param {Array} images - Array de imagens
   * @returns {Array} Imagens processadas
   */
  processSpeciesImages(images) {
    if (!images || !Array.isArray(images)) {
      return [];
    }

    return images.map(img => ({
      organ: img.organ,
      author: img.author,
      license: img.license,
      date: img.date?.timestamp,
      url: {
        original: img.url?.o,
        medium: img.url?.m,
        small: img.url?.s,
      },
    }));
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
        case 401:
          return new Error('API key inválida ou não fornecida');
        case 404:
          return new Error('Projeto não encontrado');
        case 413:
          return new Error('Arquivo muito grande');
        case 429:
          return new Error('Limite de requisições excedido');
        case 500:
          return new Error('Erro interno do servidor PlantNet');
        default:
          return new Error(`Erro da API PlantNet: ${status} - ${data.message || 'Erro desconhecido'}`);
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('Timeout na requisição para PlantNet API');
    }

    if (error.code === 'ENOTFOUND') {
      return new Error('Não foi possível conectar com PlantNet API');
    }

    return error;
  }

  /**
   * Obtém informações sobre projetos disponíveis
   * @returns {Promise<Array>} Lista de projetos
   */
  async getAvailableProjects() {
    try {
      const response = await axios.get('https://my-api.plantnet.org/v1/projects', {
        headers: {
          'Api-Key': this.apiKey,
        },
      });

      return response.data.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        language: project.language,
        territory: project.territory,
      }));
    } catch (error) {
      console.error('❌ Error fetching PlantNet projects:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Verifica status da API e cota restante
   * @returns {Promise<Object>} Status da API
   */
  async getApiStatus() {
    try {
      // Fazer uma requisição simples para verificar status
      const response = await axios.get('https://my-api.plantnet.org/v1/projects', {
        headers: {
          'Api-Key': this.apiKey,
        },
      });

      return {
        status: 'active',
        remainingRequests: response.headers['x-ratelimit-remaining'] || 'unknown',
        resetTime: response.headers['x-ratelimit-reset'] || 'unknown',
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Busca espécie por nome científico
   * @param {string} scientificName - Nome científico
   * @returns {Promise<Object>} Informações da espécie
   */
  async searchByScientificName(scientificName) {
    try {
      // PlantNet não tem endpoint de busca por nome
      // Esta funcionalidade seria implementada usando GBIF
      throw new Error('Busca por nome científico deve usar GBIF API');
    } catch (error) {
      console.error('❌ PlantNet search error:', error.message);
      throw error;
    }
  }
}

module.exports = PlantNetService;