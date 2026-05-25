import { useState, useEffect } from 'react'
import { Button, DatePicker, Card, Tabs, message, Spin, Empty, Statistic, Space } from 'antd'
import { FileTextOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

type ReportType = 'daily' | 'weekly' | 'monthly'

export default function ReportPage() {
  const [reportType, setReportType] = useState<ReportType>('daily')
  const [reportDate, setReportDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [loading, setLoading] = useState(false)
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = async () => {
    if (!reportDate) { message.warning('请选择日期'); return }
    setLoading(true)
    setGenerated(true)
    setReportHtml(null)
    setReportData(null)
    try {
      const result = await window.api.previewReport(reportType, reportDate)
      setReportHtml(result.html)
      setReportData(result.report)
    } catch (e) {
      message.error('生成报告失败')
    }
    setLoading(false)
  }

  // Auto-preview when date or report type changes (after user has selected)
  useEffect(() => {
    if (reportDate) {
      handleGenerate()
    }
  }, [reportDate, reportType])

  const handleExportHtml = async () => {
    if (!reportData) return
    setLoading(true)
    try {
      const result = await window.api.exportReportHtml(reportType, reportDate)
      if (result.success) {
        message.success(`报告已导出到: ${result.filePath}`)
      }
    } catch (e) {
      message.error('导出失败')
    }
    setLoading(false)
  }

  const handleExportTxt = async () => {
    if (!reportData) return
    setLoading(true)
    try {
      const result = await window.api.exportReportTxt(reportType, reportDate)
      if (result.success) {
        message.success(`报告已导出到: ${result.filePath}`)
      }
    } catch (e) {
      message.error('导出失败')
    }
    setLoading(false)
  }

  const reportTypeLabel = { daily: '日报', weekly: '周报', monthly: '月报' }

  return (
    <div className="page-shell" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', overflow: 'hidden' }}>
      <div>
        <h1 className="page-title" style={{ marginBottom: 4 }}>报告生成</h1>
        <p className="page-kicker" style={{ marginBottom: 14 }}>选择日期范围，预览并导出工作报告。</p>
        <Card className="surface-card" size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Tabs
              activeKey={reportType}
              onChange={(k) => setReportType(k as ReportType)}
              size="small"
              items={[
                { key: 'daily', label: '日报' },
                { key: 'weekly', label: '周报' },
                { key: 'monthly', label: '月报' },
              ]}
              style={{ marginBottom: 0 }}
            />
            <DatePicker
              value={reportDate ? dayjs(reportDate) : null}
              onChange={(d) => setReportDate(d ? d.format('YYYY-MM-DD') : '')}
              picker={reportType === 'monthly' ? 'month' : reportType === 'weekly' ? 'week' : 'date'}
              placeholder={`选择${reportTypeLabel[reportType]}日期`}
              style={{ width: 200 }}
            />
            <Button type="primary" icon={<EyeOutlined />} onClick={handleGenerate} loading={loading}>
              生成{reportTypeLabel[reportType]}
            </Button>
          </div>
        </Card>
      </div>

      {/* Content area - grid 1fr guarantees explicit track size */}
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        {!generated && !loading ? (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Empty description={`选择日期并点击"生成${reportTypeLabel[reportType]}"以预览报告`}>
              <FileTextOutlined style={{ fontSize: 64, color: '#ddd' }} />
            </Empty>
          </div>
        ) : loading ? (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin size="large" />
          </div>
        ) : reportData ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexShrink: 0 }}>
              <Card className="surface-card" size="small" style={{ flex: 1, textAlign: 'center' }}>
                <Statistic title="总任务" value={reportData.summary.total} />
              </Card>
              <Card className="surface-card" size="small" style={{ flex: 1, textAlign: 'center' }}>
                <Statistic title="已完成" value={reportData.summary.completed} valueStyle={{ color: '#059669' }} />
              </Card>
              <Card className="surface-card" size="small" style={{ flex: 1, textAlign: 'center' }}>
                <Statistic title="进行中" value={reportData.summary.inProgress} valueStyle={{ color: '#2563eb' }} />
              </Card>
              <Card className="surface-card" size="small" style={{ flex: 1, textAlign: 'center' }}>
                <Statistic title="待办" value={reportData.summary.todo} valueStyle={{ color: '#64748b' }} />
              </Card>
            </div>

            {/* Report preview */}
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              border: '1px solid var(--color-border-soft)', borderRadius: 8, background: '#fff', overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0
              }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{reportData.title || '报告预览'}</span>
                <Space>
                  <Button size="small" icon={<DownloadOutlined />} onClick={handleExportHtml}>
                    导出 HTML
                  </Button>
                  <Button size="small" icon={<DownloadOutlined />} onClick={handleExportTxt}>
                    导出 TXT
                  </Button>
                </Space>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {reportHtml ? (
                  <iframe
                    title="report-preview"
                    srcDoc={reportHtml}
                    style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff' }}
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Empty description="无数据" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Empty description="该日期暂无数据" />
          </div>
        )}
      </div>
    </div>
  )
}
