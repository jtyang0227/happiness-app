package com.happiness.app.newsletter;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NewsletterRepository extends JpaRepository<NewsletterSubscriber, Long> {
    Optional<NewsletterSubscriber> findByMemberIdAndEmail(Long memberId, String email);
    Optional<NewsletterSubscriber> findByToken(String token);
    List<NewsletterSubscriber> findByMemberIdAndUnsubscribedAtIsNullOrderBySubscribedAtDesc(Long memberId);
    long countByMemberIdAndUnsubscribedAtIsNull(Long memberId);
}
