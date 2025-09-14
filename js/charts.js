// Gestión de gráficos
class ChartsManager {
    constructor() {
        this.dailySpendingChart = null;
        this.categoryExpensesChart = null;
    }

    // Inicializar gráficos
    initCharts() {
        this.setupDailySpendingChart();
        this.setupCategoryExpensesChart();
    }

    // Configurar gráfico de gastos diarios
    setupDailySpendingChart() {
        const ctx = document.getElementById('dailySpendingChart');
        if (!ctx) {
            console.error('No se encontró el elemento canvas para el gráfico diario');
            return;
        }
        
        // Datos iniciales vacíos
        const data = {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            expenses: [0, 0, 0, 0, 0, 0, 0],
            budget: [0, 0, 0, 0, 0, 0, 0]
        };
        
        this.dailySpendingChart = new Chart(ctx, this.getDailySpendingConfig(data));
    }

    // Configurar gráfico de gastos por categoría
    setupCategoryExpensesChart() {
        const ctx = document.getElementById('categoryExpensesChart');
        if (!ctx) {
            console.error('No se encontró el elemento canvas para el gráfico de categorías');
            return;
        }
        
        // Datos iniciales vacíos
        const data = {
            labels: ['Cargando...'],
            values: [100]
        };
        
        this.categoryExpensesChart = new Chart(ctx, this.getCategoryExpensesConfig(data));
    }

    // Configuración para gráfico de gastos diarios
    getDailySpendingConfig(data) {
        return {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Gastos',
                        data: data.expenses,
                        borderColor: '#4299e1',
                        backgroundColor: 'rgba(66, 153, 225, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#4299e1',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Presupuesto Diario',
                        data: data.budget,
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderDash: [5, 5],
                        pointBackgroundColor: '#48bb78',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#2D3748',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#718096'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(160, 174, 192, 0.1)'
                        },
                        ticks: {
                            color: '#718096',
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        };
    }

    // Configuración para gráfico de gastos por categoría
    getCategoryExpensesConfig(data) {
        return {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#4299e1', '#48bb78', '#ed8936', '#e53e3e', 
                        '#9f7aea', '#f56565', '#38a169', '#d69e2e'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: '#2D3748'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#2D3748',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };
    }

    // Actualizar gráfico de gastos diarios con datos reales
    updateDailySpendingChart(data) {
        if (this.dailySpendingChart) {
            this.dailySpendingChart.data.labels = data.labels;
            this.dailySpendingChart.data.datasets[0].data = data.expenses;
            this.dailySpendingChart.data.datasets[1].data = data.budget;
            this.dailySpendingChart.update();
        }
    }

    // Actualizar gráfico de gastos por categoría con datos reales
    updateCategoryExpensesChart(data) {
        if (this.categoryExpensesChart) {
            this.categoryExpensesChart.data.labels = data.labels;
            this.categoryExpensesChart.data.datasets[0].data = data.values;
            this.categoryExpensesChart.update();
        }
    }

    // Obtener datos de gastos diarios de los últimos 7 días
    async getDailySpendingData(transactions) {
        try {
            // Filtrar solo gastos de los últimos 7 días
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const expenses = transactions.filter(t => 
                t.type === 'expense' && 
                new Date(t.date) >= sevenDaysAgo
            );
            
            // Agrupar por día
            const dailyData = {};
            const labels = [];
            const expensesData = [];
            
            // Inicializar datos para los últimos 7 días
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                const dayName = dayNames[date.getDay()];
                
                labels.push(dayName);
                dailyData[dateStr] = 0;
            }
            
            // Sumar gastos por día
            expenses.forEach(expense => {
                const dateStr = expense.date;
                if (dailyData.hasOwnProperty(dateStr)) {
                    dailyData[dateStr] += expense.amount;
                }
            });
            
            // Preparar datos para el gráfico
            Object.keys(dailyData).forEach(dateStr => {
                expensesData.push(dailyData[dateStr]);
            });
            
            // Obtener presupuesto diario (promedio mensual)
            const budgetData = new Array(7).fill(await this.getDailyBudget());
            
            return {
                labels: labels,
                expenses: expensesData,
                budget: budgetData
            };
        } catch (error) {
            console.error('Error obteniendo datos de gastos diarios:', error);
            return {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                expenses: [0, 0, 0, 0, 0, 0, 0],
                budget: [0, 0, 0, 0, 0, 0, 0]
            };
        }
    }
    
    // Obtener presupuesto diario (promedio mensual)
    async getDailyBudget() {
        // En una implementación real, esto vendría de la configuración del usuario
        // Por ahora, usaremos un valor predeterminado
        return 60;
    }
    
    // Obtener datos de gastos por categoría
    async getCategoryExpensesData(transactions) {
        try {
            const expenses = transactions.filter(t => t.type === 'expense');
            
            // Agrupar por categoría
            const categoryData = {};
            
            expenses.forEach(expense => {
                if (!categoryData[expense.category]) {
                    categoryData[expense.category] = 0;
                }
                categoryData[expense.category] += expense.amount;
            });
            
            // Preparar datos para el gráfico
            const labels = [];
            const values = [];
            
            Object.keys(categoryData).forEach(category => {
                labels.push(transactionsManager.getCategoryLabel(category, 'expense'));
                values.push(categoryData[category]);
            });
            
            return {
                labels: labels,
                values: values
            };
        } catch (error) {
            console.error('Error obteniendo datos de gastos por categoría:', error);
            return {
                labels: ['Comida', 'Transporte', 'Entretenimiento'],
                values: [100, 50, 75]
            };
        }
    }
}

// Instancia global del gestor de gráficos
const chartsManager = new ChartsManager();