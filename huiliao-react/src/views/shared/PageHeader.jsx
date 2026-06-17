export default function PageHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`view-page-header flex-between ${className}`}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="view-page-header__sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
