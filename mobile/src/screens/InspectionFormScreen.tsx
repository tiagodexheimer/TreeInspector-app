import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

import LocationService, { LocationCoordinates } from '../services/LocationService';
import CameraService, { PhotoData, PhotoType } from '../services/CameraService';
import InspectionModel, { CreateInspectionData, InspectionType, RiskLevel, ConditionStatus } from '../models/InspectionModel';
import TreeModel from '../models/TreeModel';

interface RouteParams {
  treeId?: string;
  inspectionId?: string;
}

export const InspectionFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { treeId, inspectionId } = route.params as RouteParams;

  // Services
  const locationService = LocationService.getInstance();
  const cameraService = CameraService.getInstance();
  const inspectionModel = new InspectionModel();
  const treeModel = new TreeModel();

  // State
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  
  // Form data
  const [formData, setFormData] = useState<CreateInspectionData>({
    tree_id: treeId || '',
    inspector_id: 'current_user_id', // TODO: Get from auth context
    inspection_type: InspectionType.ROUTINE,
    risk_level: RiskLevel.LOW,
  });

  // Weather data
  const [weatherData, setWeatherData] = useState({
    conditions: '',
    temperature: '',
    humidity: '',
    windSpeed: '',
  });

  // Structural assessment
  const [structuralData, setStructuralData] = useState({
    trunkCondition: ConditionStatus.GOOD,
    trunkDefects: '',
    rootCondition: ConditionStatus.GOOD,
    rootDefects: '',
    crownCondition: ConditionStatus.GOOD,
    crownDefects: '',
    branchCondition: ConditionStatus.GOOD,
    branchDefects: '',
  });

  // Phytosanitary assessment
  const [phytosanitaryData, setPhytosanitaryData] = useState({
    pestPresence: '',
    diseasePresence: '',
    pestSeverity: 1,
    diseaseSeverity: 1,
  });

  // Risk assessment
  const [riskData, setRiskData] = useState({
    riskFactors: '',
    probabilityFailure: 1,
    consequenceFailure: 1,
    riskMatrixResult: 1,
  });

  // Recommendations
  const [recommendationsData, setRecommendationsData] = useState({
    recommendations: '',
    priorityLevel: 1,
    nextInspectionDate: '',
  });

  // Observations
  const [observationsData, setObservationsData] = useState({
    generalObservations: '',
    equipmentUsed: '',
  });

  useEffect(() => {
    initializeForm();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    // Calcular matriz de risco quando probabilidade ou consequência mudam
    const riskMatrix = inspectionModel.calculateRiskMatrix(
      riskData.probabilityFailure,
      riskData.consequenceFailure
    );
    setRiskData(prev => ({ ...prev, riskMatrixResult: riskMatrix }));
    setFormData(prev => ({ ...prev, risk_level: riskMatrix }));
  }, [riskData.probabilityFailure, riskData.consequenceFailure]);

  const initializeForm = async () => {
    if (inspectionId) {
      // Carregar inspeção existente para edição
      try {
        const inspection = await inspectionModel.findById(inspectionId);
        if (inspection) {
          // Preencher formulário com dados existentes
          // TODO: Implementar carregamento dos dados
        }
      } catch (error) {
        console.error('Erro ao carregar inspeção:', error);
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert('Erro', 'Não foi possível obter a localização atual');
    }
  };

  const handleTakePhoto = async (photoType: PhotoType) => {
    try {
      const photo = await cameraService.capturePhoto(
        { quality: 0.8, maxWidth: 1920, maxHeight: 1920 },
        currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : undefined
      );

      photo.photoType = photoType;
      setPhotos(prev => [...prev, photo]);
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      Alert.alert('Erro', 'Não foi possível capturar a foto');
    }
  };

  const handleSelectPhoto = async (photoType: PhotoType) => {
    try {
      const photo = await cameraService.selectFromGallery(
        { quality: 0.8, maxWidth: 1920, maxHeight: 1920 },
        currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : undefined
      );

      photo.photoType = photoType;
      setPhotos(prev => [...prev, photo]);
    } catch (error) {
      console.error('Erro ao selecionar foto:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a foto');
    }
  };

  const showPhotoOptions = (photoType: PhotoType) => {
    Alert.alert(
      'Adicionar Foto',
      'Escolha uma opção:',
      [
        { text: 'Câmera', onPress: () => handleTakePhoto(photoType) },
        { text: 'Galeria', onPress: () => handleSelectPhoto(photoType) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const validateForm = (): boolean => {
    if (!formData.tree_id) {
      Alert.alert('Erro', 'ID da árvore é obrigatório');
      return false;
    }

    if (!formData.inspection_type) {
      Alert.alert('Erro', 'Tipo de inspeção é obrigatório');
      return false;
    }

    if (formData.risk_level < 1 || formData.risk_level > 5) {
      Alert.alert('Erro', 'Nível de risco deve estar entre 1 e 5');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Preparar dados da inspeção
      const inspectionData: CreateInspectionData = {
        ...formData,
        weather_conditions: weatherData.conditions,
        temperature: weatherData.temperature ? parseFloat(weatherData.temperature) : undefined,
        humidity: weatherData.humidity ? parseFloat(weatherData.humidity) : undefined,
        wind_speed: weatherData.windSpeed ? parseFloat(weatherData.windSpeed) : undefined,
        
        trunk_condition: structuralData.trunkCondition,
        trunk_defects: structuralData.trunkDefects,
        root_condition: structuralData.rootCondition,
        root_defects: structuralData.rootDefects,
        crown_condition: structuralData.crownCondition,
        crown_defects: structuralData.crownDefects,
        branch_condition: structuralData.branchCondition,
        branch_defects: structuralData.branchDefects,
        
        pest_presence: phytosanitaryData.pestPresence,
        disease_presence: phytosanitaryData.diseasePresence,
        pest_severity: phytosanitaryData.pestSeverity,
        disease_severity: phytosanitaryData.diseaseSeverity,
        
        risk_factors: riskData.riskFactors,
        probability_failure: riskData.probabilityFailure,
        consequence_failure: riskData.consequenceFailure,
        risk_matrix_result: riskData.riskMatrixResult,
        
        recommendations: recommendationsData.recommendations,
        priority_level: recommendationsData.priorityLevel,
        next_inspection_date: recommendationsData.nextInspectionDate,
        
        general_observations: observationsData.generalObservations,
        equipment_used: observationsData.equipmentUsed,
      };

      // Salvar inspeção
      const inspection = await inspectionModel.create(inspectionData);

      // TODO: Salvar fotos associadas à inspeção
      // for (const photo of photos) {
      //   await photoModel.create({
      //     inspection_id: inspection.id,
      //     ...photo
      //   });
      // }

      Alert.alert(
        'Sucesso',
        'Inspeção salva com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao salvar inspeção:', error);
      Alert.alert('Erro', 'Não foi possível salvar a inspeção');
    } finally {
      setLoading(false);
    }
  };

  const renderPhotoSection = (title: string, photoType: PhotoType) => {
    const sectionPhotos = photos.filter(photo => photo.photoType === photoType);

    return (
      <View style={styles.photoSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.addPhotoButton}
          onPress={() => showPhotoOptions(photoType)}
        >
          <Text style={styles.addPhotoText}>+ Adicionar Foto</Text>
        </TouchableOpacity>
        
        {sectionPhotos.length > 0 && (
          <ScrollView horizontal style={styles.photoList}>
            {sectionPhotos.map((photo) => (
              <View key={photo.id} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(photo.id)}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nova Inspeção</Text>
        {currentLocation && (
          <Text style={styles.locationText}>
            📍 {locationService.formatCoordinates(currentLocation)}
          </Text>
        )}
      </View>

      {/* Informações Básicas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Básicas</Text>
        
        <Text style={styles.label}>Tipo de Inspeção</Text>
        <Picker
          selectedValue={formData.inspection_type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, inspection_type: value }))}
          style={styles.picker}
        >
          <Picker.Item label="Rotina" value={InspectionType.ROUTINE} />
          <Picker.Item label="Detalhada" value={InspectionType.DETAILED} />
          <Picker.Item label="Emergência" value={InspectionType.EMERGENCY} />
          <Picker.Item label="Pós-tempestade" value={InspectionType.POST_STORM} />
          <Picker.Item label="Acompanhamento" value={InspectionType.FOLLOW_UP} />
        </Picker>
      </View>

      {/* Condições Climáticas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Condições Climáticas</Text>
        
        <Text style={styles.label}>Condições</Text>
        <TextInput
          style={styles.input}
          value={weatherData.conditions}
          onChangeText={(text) => setWeatherData(prev => ({ ...prev, conditions: text }))}
          placeholder="Ex: Ensolarado, nublado, chuvoso..."
        />
        
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Temperatura (°C)</Text>
            <TextInput
              style={styles.input}
              value={weatherData.temperature}
              onChangeText={(text) => setWeatherData(prev => ({ ...prev, temperature: text }))}
              placeholder="25"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Umidade (%)</Text>
            <TextInput
              style={styles.input}
              value={weatherData.humidity}
              onChangeText={(text) => setWeatherData(prev => ({ ...prev, humidity: text }))}
              placeholder="60"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Avaliação Estrutural */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avaliação Estrutural</Text>
        
        <Text style={styles.label}>Condição do Tronco</Text>
        <Picker
          selectedValue={structuralData.trunkCondition}
          onValueChange={(value) => setStructuralData(prev => ({ ...prev, trunkCondition: value }))}
          style={styles.picker}
        >
          <Picker.Item label="Excelente" value={ConditionStatus.EXCELLENT} />
          <Picker.Item label="Bom" value={ConditionStatus.GOOD} />
          <Picker.Item label="Regular" value={ConditionStatus.FAIR} />
          <Picker.Item label="Ruim" value={ConditionStatus.POOR} />
          <Picker.Item label="Crítico" value={ConditionStatus.CRITICAL} />
        </Picker>
        
        <Text style={styles.label}>Defeitos do Tronco</Text>
        <TextInput
          style={styles.textArea}
          value={structuralData.trunkDefects}
          onChangeText={(text) => setStructuralData(prev => ({ ...prev, trunkDefects: text }))}
          placeholder="Descreva defeitos observados no tronco..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Fotos */}
      {renderPhotoSection('Fotos Gerais', PhotoType.TREE_OVERVIEW)}
      {renderPhotoSection('Fotos do Tronco', PhotoType.TRUNK_DETAIL)}
      {renderPhotoSection('Fotos da Copa', PhotoType.CROWN_DETAIL)}
      {renderPhotoSection('Defeitos', PhotoType.DEFECT_DETAIL)}

      {/* Avaliação de Risco */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avaliação de Risco ABNT</Text>
        
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Probabilidade de Falha (1-5)</Text>
            <Picker
              selectedValue={riskData.probabilityFailure}
              onValueChange={(value) => setRiskData(prev => ({ ...prev, probabilityFailure: value }))}
              style={styles.picker}
            >
              <Picker.Item label="1 - Muito Baixa" value={1} />
              <Picker.Item label="2 - Baixa" value={2} />
              <Picker.Item label="3 - Moderada" value={3} />
              <Picker.Item label="4 - Alta" value={4} />
              <Picker.Item label="5 - Muito Alta" value={5} />
            </Picker>
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Consequência (1-5)</Text>
            <Picker
              selectedValue={riskData.consequenceFailure}
              onValueChange={(value) => setRiskData(prev => ({ ...prev, consequenceFailure: value }))}
              style={styles.picker}
            >
              <Picker.Item label="1 - Muito Baixa" value={1} />
              <Picker.Item label="2 - Baixa" value={2} />
              <Picker.Item label="3 - Moderada" value={3} />
              <Picker.Item label="4 - Alta" value={4} />
              <Picker.Item label="5 - Muito Alta" value={5} />
            </Picker>
          </View>
        </View>
        
        <View style={styles.riskResult}>
          <Text style={styles.riskResultText}>
            Resultado da Matriz de Risco: {riskData.riskMatrixResult}
          </Text>
          <Text style={styles.riskLevelText}>
            Nível: {getRiskLevelText(riskData.riskMatrixResult)}
          </Text>
        </View>
      </View>

      {/* Recomendações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recomendações</Text>
        
        <Text style={styles.label}>Recomendações</Text>
        <TextInput
          style={styles.textArea}
          value={recommendationsData.recommendations}
          onChangeText={(text) => setRecommendationsData(prev => ({ ...prev, recommendations: text }))}
          placeholder="Descreva as recomendações para esta árvore..."
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.label}>Nível de Prioridade (1-5)</Text>
        <Picker
          selectedValue={recommendationsData.priorityLevel}
          onValueChange={(value) => setRecommendationsData(prev => ({ ...prev, priorityLevel: value }))}
          style={styles.picker}
        >
          <Picker.Item label="1 - Muito Baixa" value={1} />
          <Picker.Item label="2 - Baixa" value={2} />
          <Picker.Item label="3 - Moderada" value={3} />
          <Picker.Item label="4 - Alta" value={4} />
          <Picker.Item label="5 - Muito Alta" value={5} />
        </Picker>
      </View>

      {/* Observações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações</Text>
        
        <Text style={styles.label}>Observações Gerais</Text>
        <TextInput
          style={styles.textArea}
          value={observationsData.generalObservations}
          onChangeText={(text) => setObservationsData(prev => ({ ...prev, generalObservations: text }))}
          placeholder="Observações adicionais sobre a inspeção..."
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.label}>Equipamentos Utilizados</Text>
        <TextInput
          style={styles.input}
          value={observationsData.equipmentUsed}
          onChangeText={(text) => setObservationsData(prev => ({ ...prev, equipmentUsed: text }))}
          placeholder="Ex: Trena, clinômetro, resistógrafo..."
        />
      </View>

      {/* Botões */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Salvar Inspeção</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const getRiskLevelText = (level: number): string => {
  switch (level) {
    case 1: return 'Muito Baixo';
    case 2: return 'Baixo';
    case 3: return 'Moderado';
    case 4: return 'Alto';
    case 5: return 'Muito Alto';
    default: return 'Indefinido';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2e7d32',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#e8f5e8',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  photoSection: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  addPhotoButton: {
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  addPhotoText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  photoList: {
    flexDirection: 'row',
  },
  photoContainer: {
    marginRight: 10,
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  riskResult: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  riskResultText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  riskLevelText: {
    fontSize: 14,
    color: '#2e7d32',
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#2e7d32',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default InspectionFormScreen;