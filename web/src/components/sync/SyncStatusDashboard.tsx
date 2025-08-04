import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RefreshCw, Smartphone, Upload, Download, AlertTriangle, CheckCircle } from 'lucide-react';

interface SyncStats {
  userId: string;
  deviceId?: string;
  statistics: {
    total_syncs: number;
    last_sync: string | null;
    total_uploaded_trees: number;
    total_uploaded_inspections: number;
    total_conflicts: number;
    success_rate: number;
  };
  serverTime: string;
}

interface SyncHistory {
  id: string;
  device_id: string;
  sync_timestamp: string;
  uploaded_trees: number;
  uploaded_inspections: number;
  uploaded_photos: number;
  downloaded_trees: number;
  downloaded_inspections: number;
  downloaded_photos: number;
  conflicts_count: number;
  status: string;
  duration_ms?: number;
}

interface SyncConflict {
  id: string;
  device_id: string;
  conflict_type: string;
  mobile_id: string;
  server_id?: number;
  conflict_reason: string;
  status: string;
  created_at: string;
}

export const SyncStatusDashboard: React.FC = () => {
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSyncData = async () => {
    try {
      setRefreshing(true);

      // Buscar estatísticas
      const statsResponse = await fetch('/api/v1/sync/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setSyncStats(statsData.data);
      }

      // Buscar histórico
      const historyResponse = await fetch('/api/v1/sync/history?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setSyncHistory(historyData.data.history);
      }

      // Buscar conflitos
      const conflictsResponse = await fetch('/api/v1/sync/conflicts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (conflictsResponse.ok) {
        const conflictsData = await conflictsResponse.json();
        setConflicts(conflictsData.data.conflicts);
      }

    } catch (error) {
      console.error('Erro ao buscar dados de sincronização:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSyncData();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchSyncData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Concluída</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'pending':
        return <Badge variant="warning">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConflictTypeBadge = (type: string) => {
    const colors = {
      tree: 'bg-green-100 text-green-800',
      inspection: 'bg-blue-100 text-blue-800',
      photo: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados de sincronização...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Status de Sincronização</h2>
        <Button 
          onClick={fetchSyncData} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas Gerais */}
      {syncStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Sincronizações</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncStats.statistics.total_syncs}</div>
              <p className="text-xs text-muted-foreground">
                Taxa de sucesso: {(syncStats.statistics.success_rate * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Árvores Sincronizadas</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncStats.statistics.total_uploaded_trees}</div>
              <p className="text-xs text-muted-foreground">
                Inspeções: {syncStats.statistics.total_uploaded_inspections}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conflitos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncStats.statistics.total_conflicts}</div>
              <p className="text-xs text-muted-foreground">
                Pendentes: {conflicts.filter(c => c.status === 'pending').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {syncStats.statistics.last_sync 
                  ? formatDate(syncStats.statistics.last_sync)
                  : 'Nunca'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Servidor: {formatDate(syncStats.serverTime)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Histórico de Sincronizações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma sincronização encontrada.</p>
          ) : (
            <div className="space-y-4">
              {syncHistory.map((sync) => (
                <div key={sync.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Dispositivo: {sync.device_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sync.sync_timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm">
                        <Upload className="h-3 w-3" />
                        <span>{sync.uploaded_trees}T {sync.uploaded_inspections}I {sync.uploaded_photos}F</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Download className="h-3 w-3" />
                        <span>{sync.downloaded_trees}T {sync.downloaded_inspections}I {sync.downloaded_photos}F</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {getStatusBadge(sync.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDuration(sync.duration_ms)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflitos Pendentes */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Conflitos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                  <div className="flex items-center space-x-3">
                    {getConflictTypeBadge(conflict.conflict_type)}
                    <div>
                      <p className="font-medium">ID: {conflict.mobile_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {conflict.conflict_reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">Dispositivo: {conflict.device_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conflict.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SyncStatusDashboard;