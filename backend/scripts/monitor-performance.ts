/**
 * Performance Monitoring Script
 * ทดสอบ CPU และ RAM usage ของ backend
 */

import os from 'os';
import process from 'process';

interface PerformanceMetrics {
    timestamp: string;
    cpu: {
        usage: number; // percentage
        cores: number;
        model: string;
    };
    memory: {
        used: number; // MB
        total: number; // MB
        percentage: number;
        heapUsed: number; // MB
        heapTotal: number; // MB
        external: number; // MB
        rss: number; // MB
    };
    uptime: number; // seconds
}

class PerformanceMonitor {
    private startCpuUsage = process.cpuUsage();
    private startTime = Date.now();
    private measurements: PerformanceMetrics[] = [];

    /**
     * Get current CPU usage percentage
     */
    getCpuUsage(): number {
        const cpuUsage = process.cpuUsage(this.startCpuUsage);
        const elapsedTime = Date.now() - this.startTime;
        
        // Calculate CPU usage percentage
        const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000; // microseconds to milliseconds
        const cpuPercentage = (totalCpuTime / elapsedTime) * 100;
        
        // Reset for next measurement
        this.startCpuUsage = process.cpuUsage();
        this.startTime = Date.now();
        
        return Math.min(Math.max(cpuPercentage, 0), 100); // Cap between 0-100%
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            used: Math.round(usedMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: Math.round((usedMem / totalMem) * 100),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB (Resident Set Size)
        };
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics {
        const cpus = os.cpus();
        
        return {
            timestamp: new Date().toISOString(),
            cpu: {
                usage: this.getCpuUsage(),
                cores: cpus.length,
                model: cpus[0]?.model || 'Unknown',
            },
            memory: this.getMemoryUsage(),
            uptime: Math.round(process.uptime()),
        };
    }

    /**
     * Create progress bar
     */
    private createBar(value: number, max: number, width: number = 30): string {
        const percentage = Math.min((value / max) * 100, 100);
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        
        let color = '';
        if (percentage > 80) color = '🔴';
        else if (percentage > 60) color = '🟡';
        else color = '🟢';
        
        return `${color} [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(1)}%`;
    }

    /**
     * Format metrics for display
     */
    formatMetrics(metrics: PerformanceMetrics): string {
        const time = new Date(metrics.timestamp).toLocaleTimeString('th-TH');
        
        return `
╔════════════════════════════════════════════════════════════════════╗
║  🔍 Performance Metrics - ${time}                          ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  💻 CPU                                                            ║
║     Usage:  ${this.createBar(metrics.cpu.usage, 100, 30)}                    ║
║     Cores:  ${metrics.cpu.cores} cores                                           ║
║     Model:  ${metrics.cpu.model.substring(0, 40)}...  ║
║                                                                    ║
║  🧠 Memory (Process)                                               ║
║     Heap:   ${this.createBar(metrics.memory.heapUsed, metrics.memory.heapTotal, 30)}                    ║
║             ${metrics.memory.heapUsed} MB / ${metrics.memory.heapTotal} MB                                    ║
║     RSS:    ${metrics.memory.rss} MB (Resident Set Size)                        ║
║     External: ${metrics.memory.external} MB                                          ║
║                                                                    ║
║  🖥️  Memory (System)                                               ║
║     Used:   ${this.createBar(metrics.memory.used, metrics.memory.total, 30)}                    ║
║             ${metrics.memory.used} MB / ${metrics.memory.total} MB (${metrics.memory.percentage}%)                  ║
║                                                                    ║
║  ⏱️  Uptime: ${metrics.uptime} seconds (${Math.floor(metrics.uptime / 60)} minutes)                    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
        `.trim();
    }

    /**
     * Get statistics from measurements
     */
    getStatistics() {
        if (this.measurements.length === 0) return null;

        const cpuUsages = this.measurements.map(m => m.cpu.usage);
        const heapUsages = this.measurements.map(m => m.memory.heapUsed);

        return {
            cpu: {
                avg: (cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length).toFixed(2),
                min: Math.min(...cpuUsages).toFixed(2),
                max: Math.max(...cpuUsages).toFixed(2),
            },
            memory: {
                avg: Math.round(heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length),
                min: Math.min(...heapUsages),
                max: Math.max(...heapUsages),
            },
        };
    }

    /**
     * Display statistics
     */
    displayStatistics() {
        const stats = this.getStatistics();
        if (!stats) return;

        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════════╗');
        console.log('║  📊 Statistics (Since Start)                                       ║');
        console.log('╠════════════════════════════════════════════════════════════════════╣');
        console.log(`║  CPU:    Avg: ${stats.cpu.avg}%  Min: ${stats.cpu.min}%  Max: ${stats.cpu.max}%              ║`);
        console.log(`║  Memory: Avg: ${stats.memory.avg} MB  Min: ${stats.memory.min} MB  Max: ${stats.memory.max} MB      ║`);
        console.log('╚════════════════════════════════════════════════════════════════════╝');
    }

    /**
     * Check for warnings
     */
    checkWarnings(metrics: PerformanceMetrics) {
        const warnings: string[] = [];

        if (metrics.cpu.usage > 80) {
            warnings.push('⚠️  HIGH CPU USAGE: ' + metrics.cpu.usage.toFixed(2) + '%');
        }

        if (metrics.memory.percentage > 80) {
            warnings.push('⚠️  HIGH SYSTEM MEMORY: ' + metrics.memory.percentage + '%');
        }

        if (metrics.memory.heapUsed > 800) {
            warnings.push('⚠️  HIGH HEAP MEMORY: ' + metrics.memory.heapUsed + ' MB');
        }

        // Check for memory leak (heap growing consistently)
        if (this.measurements.length >= 10) {
            const recent = this.measurements.slice(-10);
            const growing = recent.every((m, i) => i === 0 || m.memory.heapUsed >= recent[i - 1].memory.heapUsed);
            if (growing) {
                warnings.push('⚠️  POSSIBLE MEMORY LEAK: Heap growing consistently');
            }
        }

        if (warnings.length > 0) {
            console.log('\n');
            console.log('╔════════════════════════════════════════════════════════════════════╗');
            console.log('║  ⚠️  WARNINGS                                                      ║');
            console.log('╠════════════════════════════════════════════════════════════════════╣');
            warnings.forEach(w => {
                console.log(`║  ${w.padEnd(66)}║`);
            });
            console.log('╚════════════════════════════════════════════════════════════════════╝');
        }
    }

    /**
     * Start monitoring with interval
     */
    startMonitoring(intervalMs: number = 5000) {
        console.clear();
        console.log('🚀 Starting performance monitoring...');
        console.log('📊 Measurements every ' + (intervalMs / 1000) + ' seconds');
        console.log('👋 Press Ctrl+C to stop and see statistics\n');
        
        // Initial measurement
        const initialMetrics = this.getMetrics();
        this.measurements.push(initialMetrics);
        console.log(this.formatMetrics(initialMetrics));
        this.checkWarnings(initialMetrics);
        
        // Continuous monitoring
        const interval = setInterval(() => {
            const metrics = this.getMetrics();
            this.measurements.push(metrics);
            
            // Keep only last 100 measurements
            if (this.measurements.length > 100) {
                this.measurements.shift();
            }
            
            console.log('\n' + this.formatMetrics(metrics));
            this.checkWarnings(metrics);
        }, intervalMs);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\n👋 Stopping performance monitoring...\n');
            clearInterval(interval);
            this.displayStatistics();
            console.log('\n✅ Monitoring stopped. Total measurements: ' + this.measurements.length);
            process.exit(0);
        });
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const intervalArg = args.find(arg => arg.startsWith('--interval='));
const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) * 1000 : 5000;

// Run monitoring
console.log('🔍 Performance Monitor');
console.log('Usage: npm run monitor [--interval=5]');
console.log('');

const monitor = new PerformanceMonitor();
monitor.startMonitoring(interval);
