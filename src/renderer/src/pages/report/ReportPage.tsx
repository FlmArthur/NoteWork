import { useState, useEffect, useCallback } from 'react'
import { Button, DatePicker, Tabs, message, Spin, Empty, Space } from 'antd'
import {
  FileTextOutlined, DownloadOutlined, EyeOutlined,
  CheckCircleOutlined, SyncOutlined, PauseCircleOutlined, HistoryOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

type ReportType = 'daily' | 'weekly' | 'monthly'

interface ReportSummary {
  total: number
  completed: number
  inProgress: number
  paused: number
  todo: number
  updateCount: number
}

interface ReportData {
  title: string
  startDate: string
  endDate: string
  summary: ReportSummary
}

export default function ReportPage() {
  const [reportType, setReportType] = useState<ReportType>('daily')
  const [reportDate, setReportDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [loading, setLoading] = useState(false)
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!reportDate) {
      message.warning('请选择日期')
      return
    }
    setLoading(true)
    try {
      const result = await window.api.previewReport(reportType, reportDate)
      setReportHtml(result.html)
      setReportData(result.report)
    } catch {
      message.error('生成报告失败')
    } finally {
      setLoading(false)
    }
  }, [reportDate, reportType])

  useEffect(() => {
    handleGenerate()
  }, [handleGenerate])

  const handleExportHtml = async () => {
    if (!reportData) return
    setLoading(true)
    try {
      const result = await window.api.exportReportHtml(reportType, reportDate)
      if (result.success) message.success(`报告已导出到: ${result.filePath}`)
    } catch {
      message.error('导出失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExportTxt = async () => {
    if (!reportData) return
    setLoading(true)
    try {
      const result = await window.api.exportReportTxt(reportType, reportDate)
      if (result.success) message.success(`报告已导出到: ${result.filePath}`)
    } catch {
      message.error('导出失败')
    } finally {
      setLoading(false)
    }
  }

  const reportTypeLabel = { daily: '日报', weekly: '周报', monthly: '月报' }
  const metrics = reportData ? [
    { label: '总任务', value: reportData.summary.total, tone: 'ink', icon: <FileTextOutlined /> },
    { label: '已完成', value: reportData.summary.completed, tone: 'green', icon: <CheckCircleOutlined /> },
    { label: '进行中', value: reportData.summary.inProgress, tone: 'blue', icon: <SyncOutlined /> },
    { label: '已挂起', value: reportData.summary.paused, tone: 'amber', icon: <PauseCircleOutlined /> },
    { label: '过程记录', value: reportData.summary.updateCount, tone: 'violet', icon: <HistoryOutlined /> },
  ] : []

  return (
    <div className="page-shell report-page">
      <header className="report-command-panel">
        <div className="report-heading">
          <div>
            <p className="report-eyebrow">WORK REPORT</p>
            <h1 className="page-title">工作报告</h1>
            <p className="page-kicker">从任务状态走向过程复盘，自动汇总描述、阶段总结、当日总结和延期记录。</p>
          </div>
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={handleExportTxt} disabled={!reportData}>
              导出 TXT
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportHtml} disabled={!reportData}>
              导出 HTML
            </Button>
          </Space>
        </div>

        <div className="report-controls">
          <Tabs
            activeKey={reportType}
            onChange={(key) => setReportType(key as ReportType)}
            items={[
              { key: 'daily', label: '日报' },
              { key: 'weekly', label: '周报' },
              { key: 'monthly', label: '月报' },
            ]}
          />
          <DatePicker
            value={reportDate ? dayjs(reportDate) : null}
            onChange={(date) => setReportDate(date ? date.format('YYYY-MM-DD') : '')}
            picker={reportType === 'monthly' ? 'month' : reportType === 'weekly' ? 'week' : 'date'}
            placeholder={`选择${reportTypeLabel[reportType]}日期`}
            style={{ width: 200 }}
          />
          <Button icon={<EyeOutlined />} onClick={handleGenerate} loading={loading}>
            刷新预览
          </Button>
          {reportData && (
            <span className="report-period">{reportData.startDate} 至 {reportData.endDate}</span>
          )}
        </div>
      </header>

      {reportData && (
        <section className="report-metric-grid">
          {metrics.map(metric => (
            <div className={`report-metric report-metric-${metric.tone}`} key={metric.label}>
              <span className="report-metric-icon">{metric.icon}</span>
              <div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="report-preview-shell">
        <div className="report-preview-bar">
          <div>
            <span>报告预览</span>
            <strong>{reportData?.title || '等待生成'}</strong>
          </div>
          <span>任务有描述或总结时，会在对应任务卡片中完整呈现</span>
        </div>
        <div className="report-preview-body">
          {loading ? (
            <div className="report-loading"><Spin size="large" /></div>
          ) : reportHtml ? (
            <iframe title="report-preview" srcDoc={reportHtml} />
          ) : (
            <div className="report-loading">
              <Empty description="选择日期生成报告">
                <FileTextOutlined className="report-empty-icon" />
              </Empty>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
