'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">
                🌳 TreeInspector
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Olá, {user?.name || 'Usuário'}
              </span>
              <button
                onClick={logout}
                className="btn-secondary btn-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h2>
          <p className="text-gray-600">
            Sistema de Gestão de Inspeção de Árvores Urbanas
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    🌳
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total de Árvores
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    1,234
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                    ✅
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Inspeções Realizadas
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    856
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                    ⚠️
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Risco Alto
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    23
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-info-100 rounded-lg flex items-center justify-center">
                    📊
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Relatórios
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    45
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Ações Rápidas
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <button className="btn-primary w-full justify-start">
                  🌳 Nova Inspeção
                </button>
                <button className="btn-secondary w-full justify-start">
                  📍 Cadastrar Árvore
                </button>
                <button className="btn-secondary w-full justify-start">
                  📊 Gerar Relatório
                </button>
                <button className="btn-secondary w-full justify-start">
                  🗺️ Visualizar Mapa
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Inspeções Recentes
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      Árvore #1234
                    </p>
                    <p className="text-sm text-gray-600">
                      Praça da Sé - São Paulo
                    </p>
                  </div>
                  <span className="badge-success">
                    Baixo Risco
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      Árvore #1235
                    </p>
                    <p className="text-sm text-gray-600">
                      Av. Paulista - São Paulo
                    </p>
                  </div>
                  <span className="badge-warning">
                    Médio Risco
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      Árvore #1236
                    </p>
                    <p className="text-sm text-gray-600">
                      Parque Ibirapuera - São Paulo
                    </p>
                  </div>
                  <span className="badge-danger">
                    Alto Risco
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Mapa de Árvores
            </h3>
          </div>
          <div className="card-body">
            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-gray-600">
                  Mapa interativo será carregado aqui
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Integração com Mapbox/Leaflet em desenvolvimento
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}