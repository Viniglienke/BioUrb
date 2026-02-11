import styles from "./FormBase.module.css";

function FormBase({
  title,
  subtitle,
  onSubmit,
  children,
  className,
  error,
  success,
}) {
  return (
    <div
      className={`${styles.container}
        ${error ? styles.error : ""}
        ${success ? styles.success : ""}
        ${className || ""} `}
    >
      <form onSubmit={onSubmit} noValidate>
        <h1>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {children}

        {error && <span className={styles.errorText}>{error}</span>}
      </form>
    </div>
  );
}

export default FormBase;